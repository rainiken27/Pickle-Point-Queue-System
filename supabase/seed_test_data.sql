-- Comprehensive test data for pickleball queue system
-- Includes players across all 4 skill levels and genders
-- Run this with: psql -h localhost -p 54322 -U postgres -d postgres -f seed_test_data.sql

-- Clear existing data (careful in production!)
TRUNCATE TABLE match_history, queue, player_preferences, sessions, players, staff_users CASCADE;

-- Insert test players with diverse skill levels and genders
INSERT INTO players (id, qr_uuid, name, email, photo_url, skill_level, gender) VALUES
-- Beginner players
('550e8400-e29b-41d4-a716-446655440001', '11111111-1111-1111-1111-111111111111', 'Alice Johnson', 'alice@test.com', 'https://i.pravatar.cc/150?img=1', 'beginner', 'female'),
('550e8400-e29b-41d4-a716-446655440002', '22222222-2222-2222-2222-222222222222', 'Bob Smith', 'bob@test.com', 'https://i.pravatar.cc/150?img=12', 'beginner', 'male'),
('550e8400-e29b-41d4-a716-446655440003', '33333333-3333-3333-3333-333333333333', 'Carol White', 'carol@test.com', 'https://i.pravatar.cc/150?img=5', 'beginner', 'female'),

-- Novice players
('550e8400-e29b-41d4-a716-446655440004', '44444444-4444-4444-4444-444444444444', 'David Lee', 'david@test.com', 'https://i.pravatar.cc/150?img=13', 'novice', 'male'),
('550e8400-e29b-41d4-a716-446655440005', '55555555-5555-5555-5555-555555555555', 'Emma Davis', 'emma@test.com', 'https://i.pravatar.cc/150?img=9', 'novice', 'female'),
('550e8400-e29b-41d4-a716-446655440006', '66666666-6666-6666-6666-666666666666', 'Frank Miller', 'frank@test.com', 'https://i.pravatar.cc/150?img=14', 'novice', 'male'),
('550e8400-e29b-41d4-a716-446655440007', '77777777-7777-7777-7777-777777777777', 'Grace Kim', 'grace@test.com', 'https://i.pravatar.cc/150?img=10', 'novice', 'female'),

-- Intermediate players
('550e8400-e29b-41d4-a716-446655440008', '88888888-8888-8888-8888-888888888888', 'Henry Garcia', 'henry@test.com', 'https://i.pravatar.cc/150?img=15', 'intermediate', 'male'),
('550e8400-e29b-41d4-a716-446655440009', '99999999-9999-9999-9999-999999999999', 'Isabel Martinez', 'isabel@test.com', 'https://i.pravatar.cc/150?img=20', 'intermediate', 'female'),
('550e8400-e29b-41d4-a716-446655440010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Jack Wilson', 'jack@test.com', 'https://i.pravatar.cc/150?img=33', 'intermediate', 'male'),
('550e8400-e29b-41d4-a716-446655440011', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Karen Brown', 'karen@test.com', 'https://i.pravatar.cc/150?img=23', 'intermediate', 'female'),
('550e8400-e29b-41d4-a716-446655440012', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Leo Chen', 'leo@test.com', 'https://i.pravatar.cc/150?img=52', 'intermediate', 'male'),

-- Advanced players
('550e8400-e29b-41d4-a716-446655440013', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Maya Patel', 'maya@test.com', 'https://i.pravatar.cc/150?img=27', 'advanced', 'female'),
('550e8400-e29b-41d4-a716-446655440014', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Nathan Taylor', 'nathan@test.com', 'https://i.pravatar.cc/150?img=68', 'advanced', 'male'),
('550e8400-e29b-41d4-a716-446655440015', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Olivia Anderson', 'olivia@test.com', 'https://i.pravatar.cc/150?img=29', 'advanced', 'female'),
('550e8400-e29b-41d4-a716-446655440016', '10101010-1010-1010-1010-101010101010', 'Paul Thompson', 'paul@test.com', 'https://i.pravatar.cc/150?img=70', 'advanced', 'male'),

-- Mixed gender (for testing gender preference logic)
('550e8400-e29b-41d4-a716-446655440017', '20202020-2020-2020-2020-202020202020', 'Quinn Rivera', 'quinn@test.com', 'https://i.pravatar.cc/150?img=40', 'intermediate', 'other'),
('550e8400-e29b-41d4-a716-446655440018', '30303030-3030-3030-3030-303030303030', 'Riley Morgan', 'riley@test.com', 'https://i.pravatar.cc/150?img=41', 'novice', 'other'),

-- Additional players for group testing
('550e8400-e29b-41d4-a716-446655440019', '40404040-4040-4040-4040-404040404040', 'Sam Cooper', 'sam@test.com', 'https://i.pravatar.cc/150?img=51', 'beginner', 'male'),
('550e8400-e29b-41d4-a716-446655440020', '50505050-5050-5050-5050-505050505050', 'Tina Ross', 'tina@test.com', 'https://i.pravatar.cc/150?img=32', 'beginner', 'female');

-- Insert default preferences for all players
INSERT INTO player_preferences (player_id, skill_level_pref, gender_pref, match_type)
SELECT
  id,
  CASE
    WHEN skill_level IN ('beginner', 'novice') THEN 'beginner'
    ELSE 'intermediate_advanced'
  END as skill_level_pref,
  'random' as gender_pref,
  'solo' as match_type
FROM players;

-- Insert some test staff users
INSERT INTO staff_users (user_id, role) VALUES
('staff-cashier-1', 'cashier'),
('staff-officer-1', 'court_officer');

-- Print summary
DO $$
DECLARE
  beginner_count INT;
  novice_count INT;
  intermediate_count INT;
  advanced_count INT;
  total_count INT;
BEGIN
  SELECT COUNT(*) INTO beginner_count FROM players WHERE skill_level = 'beginner';
  SELECT COUNT(*) INTO novice_count FROM players WHERE skill_level = 'novice';
  SELECT COUNT(*) INTO intermediate_count FROM players WHERE skill_level = 'intermediate';
  SELECT COUNT(*) INTO advanced_count FROM players WHERE skill_level = 'advanced';
  SELECT COUNT(*) INTO total_count FROM players;

  RAISE NOTICE '=== Test Data Seeded Successfully ===';
  RAISE NOTICE 'Total Players: %', total_count;
  RAISE NOTICE 'Beginner: %', beginner_count;
  RAISE NOTICE 'Novice: %', novice_count;
  RAISE NOTICE 'Intermediate: %', intermediate_count;
  RAISE NOTICE 'Advanced: %', advanced_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Sample QR UUIDs for testing:';
  RAISE NOTICE 'Alice (Beginner, Female): 11111111-1111-1111-1111-111111111111';
  RAISE NOTICE 'Bob (Beginner, Male): 22222222-2222-2222-2222-222222222222';
  RAISE NOTICE 'David (Novice, Male): 44444444-4444-4444-4444-444444444444';
  RAISE NOTICE 'Emma (Novice, Female): 55555555-5555-5555-5555-555555555555';
  RAISE NOTICE 'Henry (Intermediate, Male): 88888888-8888-8888-8888-888888888888';
  RAISE NOTICE 'Isabel (Intermediate, Female): 99999999-9999-9999-9999-999999999999';
  RAISE NOTICE 'Maya (Advanced, Female): dddddddd-dddd-dddd-dddd-dddddddddddd';
  RAISE NOTICE 'Nathan (Advanced, Male): eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
END $$;
