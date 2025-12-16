-- Create the default admin user
INSERT INTO `users` (`id`, `email`, `name`, `is_admin`)
VALUES ('6039c719-cce0-4a0c-8d27-db782ae2a7eb', 'kopertop@gmail.com', 'Chris Moyer', 1)
ON CONFLICT DO NOTHING;
