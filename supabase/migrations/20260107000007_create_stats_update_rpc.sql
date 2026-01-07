-- Create RPC function for atomic match completion with stats tracking
-- This ensures all stats updates happen in a single transaction

CREATE OR REPLACE FUNCTION complete_match_with_stats(
  p_court_id UUID,
  p_team_a_player_1_id UUID,
  p_team_a_player_2_id UUID,
  p_team_b_player_1_id UUID,
  p_team_b_player_2_id UUID,
  p_team_a_score INTEGER,
  p_team_b_score INTEGER,
  p_winning_team TEXT
)
RETURNS JSON AS $$
DECLARE
  v_match_id UUID;
  v_current_year INTEGER;
  v_player_ids UUID[];
  v_winner_ids UUID[];
  v_player_id UUID;
BEGIN
  -- Get current year for yearly stats
  v_current_year := EXTRACT(YEAR FROM NOW());

  -- Validate winning_team value
  IF p_winning_team NOT IN ('team_a', 'team_b', 'tie', 'incomplete') THEN
    RAISE EXCEPTION 'Invalid winning_team value: %', p_winning_team;
  END IF;

  -- Validate team members are different
  v_player_ids := ARRAY[p_team_a_player_1_id, p_team_a_player_2_id, p_team_b_player_1_id, p_team_b_player_2_id];
  IF (SELECT COUNT(DISTINCT unnest) FROM unnest(v_player_ids)) != 4 THEN
    RAISE EXCEPTION 'All four players must be different';
  END IF;

  -- Start transaction (implicit in function)

  -- 1. Insert match history record
  INSERT INTO match_history (
    court_id,
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
    v_winner_ids := ARRAY[p_team_a_player_1_id, p_team_a_player_2_id];
  ELSIF p_winning_team = 'team_b' THEN
    v_winner_ids := ARRAY[p_team_b_player_1_id, p_team_b_player_2_id];
  ELSE
    v_winner_ids := ARRAY[]::UUID[]; -- No winners for tie/incomplete
  END IF;

  -- 3. Update stats for all 4 players
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
    'players_updated', 4,
    'winning_team', p_winning_team
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback will happen automatically
    RAISE EXCEPTION 'Failed to complete match with stats: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (court officers will be validated by RLS)
GRANT EXECUTE ON FUNCTION complete_match_with_stats TO authenticated;

-- Add comment
COMMENT ON FUNCTION complete_match_with_stats IS 'Atomically creates match history and updates player stats (lifetime and yearly) in a single transaction';
