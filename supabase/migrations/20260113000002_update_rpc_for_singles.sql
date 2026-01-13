-- Update RPC function to handle both singles and doubles matches

CREATE OR REPLACE FUNCTION complete_match_with_stats(
  p_court_id UUID,
  p_team_a_player_1_id UUID,
  p_team_a_player_2_id UUID DEFAULT NULL,
  p_team_b_player_1_id UUID DEFAULT NULL,
  p_team_b_player_2_id UUID DEFAULT NULL,
  p_team_a_score INTEGER DEFAULT NULL,
  p_team_b_score INTEGER DEFAULT NULL,
  p_winning_team TEXT DEFAULT 'incomplete'
)
RETURNS JSON AS $$
DECLARE
  v_match_id UUID;
  v_current_year INTEGER;
  v_player_ids UUID[];
  v_winner_ids UUID[];
  v_player_id UUID;
  v_match_type TEXT;
  v_player_count INTEGER;
BEGIN
  -- Get current year for yearly stats
  v_current_year := EXTRACT(YEAR FROM NOW());

  -- Validate winning_team value
  IF p_winning_team NOT IN ('team_a', 'team_b', 'tie', 'incomplete') THEN
    RAISE EXCEPTION 'Invalid winning_team value: %', p_winning_team;
  END IF;

  -- Build player IDs array (filter out NULLs)
  v_player_ids := ARRAY(
    SELECT unnest
    FROM unnest(ARRAY[p_team_a_player_1_id, p_team_a_player_2_id, p_team_b_player_1_id, p_team_b_player_2_id])
    WHERE unnest IS NOT NULL
  );

  v_player_count := array_length(v_player_ids, 1);

  -- Determine match type based on player count
  IF v_player_count = 2 THEN
    v_match_type := 'singles';
    -- For singles, validate we have exactly player 1 on each team
    IF p_team_a_player_2_id IS NOT NULL OR p_team_b_player_2_id IS NOT NULL THEN
      RAISE EXCEPTION 'Singles matches should not have player 2 on either team';
    END IF;
  ELSIF v_player_count = 4 THEN
    v_match_type := 'doubles';
    -- For doubles, validate all 4 players are provided
    IF p_team_a_player_2_id IS NULL OR p_team_b_player_2_id IS NULL THEN
      RAISE EXCEPTION 'Doubles matches require all 4 players';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid player count: %. Must be 2 (singles) or 4 (doubles)', v_player_count;
  END IF;

  -- Validate all players are different
  IF (SELECT COUNT(DISTINCT unnest) FROM unnest(v_player_ids)) != v_player_count THEN
    RAISE EXCEPTION 'All players must be different';
  END IF;

  -- 1. Insert match history record
  INSERT INTO match_history (
    court_id,
    match_type,
    team_a_player_1_id,
    team_a_player_2_id,
    team_b_player_1_id,
    team_b_player_2_id,
    team_a_score,
    team_b_score,
    winning_team,
    played_at,
    played_date
  ) VALUES (
    p_court_id,
    v_match_type,
    p_team_a_player_1_id,
    p_team_a_player_2_id,
    p_team_b_player_1_id,
    p_team_b_player_2_id,
    p_team_a_score,
    p_team_b_score,
    p_winning_team,
    NOW(),
    CURRENT_DATE
  ) RETURNING id INTO v_match_id;

  -- 2. Determine winner player IDs
  IF p_winning_team = 'team_a' THEN
    IF v_match_type = 'singles' THEN
      v_winner_ids := ARRAY[p_team_a_player_1_id];
    ELSE
      v_winner_ids := ARRAY[p_team_a_player_1_id, p_team_a_player_2_id];
    END IF;
  ELSIF p_winning_team = 'team_b' THEN
    IF v_match_type = 'singles' THEN
      v_winner_ids := ARRAY[p_team_b_player_1_id];
    ELSE
      v_winner_ids := ARRAY[p_team_b_player_1_id, p_team_b_player_2_id];
    END IF;
  ELSE
    v_winner_ids := ARRAY[]::UUID[]; -- No winners for tie/incomplete
  END IF;

  -- 3. Update stats for all players
  FOREACH v_player_id IN ARRAY v_player_ids LOOP
    -- Upsert player_stats (lifetime totals)
    INSERT INTO player_stats (player_id, lifetime_wins, lifetime_games_played)
    VALUES (
      v_player_id,
      CASE WHEN v_player_id = ANY(v_winner_ids) THEN 1 ELSE 0 END,
      1
    )
    ON CONFLICT (player_id) DO UPDATE SET
      lifetime_wins = player_stats.lifetime_wins + CASE WHEN v_player_id = ANY(v_winner_ids) THEN 1 ELSE 0 END,
      lifetime_games_played = player_stats.lifetime_games_played + 1,
      updated_at = NOW();

    -- Upsert player_stats_yearly (yearly totals)
    INSERT INTO player_stats_yearly (player_id, year, wins, games_played)
    VALUES (
      v_player_id,
      v_current_year,
      CASE WHEN v_player_id = ANY(v_winner_ids) THEN 1 ELSE 0 END,
      1
    )
    ON CONFLICT (player_id, year) DO UPDATE SET
      wins = player_stats_yearly.wins + CASE WHEN v_player_id = ANY(v_winner_ids) THEN 1 ELSE 0 END,
      games_played = player_stats_yearly.games_played + 1,
      updated_at = NOW();
  END LOOP;

  -- Return success with match ID
  RETURN json_build_object(
    'success', true,
    'match_id', v_match_id,
    'match_type', v_match_type,
    'players_updated', v_player_count,
    'winning_team', p_winning_team
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback will happen automatically
    RAISE EXCEPTION 'Failed to complete match with stats: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment update
COMMENT ON FUNCTION complete_match_with_stats IS 'Atomically creates match history (singles or doubles) and updates player stats (lifetime and yearly) in a single transaction';
