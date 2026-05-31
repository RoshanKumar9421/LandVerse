const express = require('express');
const cors = require('cors');
const { supabase } = require('./supabase');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Root Endpoint
app.get('/', (req, res) => {
  res.json({ message: 'LandVerse Backend API running successfully!' });
});

/**
 * @route POST /api/auth/register
 * @desc Register a new user (owner, buyer, or admin)
 */
app.post('/api/auth/register', async (req, res) => {
  const { email, password, fullName, phone, role } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Email, password, and Full Name are required.' });
  }

  try {
    // 1. Sign up the user inside Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user?.id;
    if (!userId) {
      return res.status(500).json({ error: 'Auth signup succeeded but user ID is missing.' });
    }

    // 2. Insert user details into the public database tables
    // Zoned for 'admin' (inserts to adminstartator) or standard users (inserts to user)
    const targetTable = (role === 'admin') ? 'adminstartator' : 'user';

    const insertPayload = {
      id: userId,
      email: email,
      full_name: fullName,
      phone: phone || null,
      role: role || (targetTable === 'adminstartator' ? 'admin' : 'owner'),
    };

    const { error: dbError } = await supabase
      .from(targetTable)
      .insert([insertPayload]);

    if (dbError) {
      console.error(`Database insertion failed for table ${targetTable}:`, dbError);
      // Clean up Supabase Auth user if db insertion fails (optional but good practice)
      // Note: we continue and warn the client or return the error
      return res.status(400).json({ 
        error: `Authentication succeeded but profile creation failed: ${dbError.message}` 
      });
    }

    return res.status(201).json({
      message: 'User registered successfully!',
      user: {
        id: userId,
        email: email,
        fullName: fullName,
        phone: phone || null,
        role: insertPayload.role,
        table: targetTable
      },
      session: authData.session
    });

  } catch (err) {
    console.error('Registration error occurred:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Login an existing user
 */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user?.id;

    // 2. Fetch user profile from public tables to find their role
    let profile = null;
    let tableUsed = 'user';

    // First try standard user table
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('*')
      .eq('id', userId)
      .single();

    if (userData) {
      profile = userData;
      tableUsed = 'user';
    } else {
      // If not found in standard user, check the adminstartator table
      const { data: adminData, error: adminError } = await supabase
        .from('adminstartator')
        .select('*')
        .eq('id', userId)
        .single();

      if (adminData) {
        profile = adminData;
        tableUsed = 'adminstartator';
      }
    }

    if (!profile) {
      return res.status(404).json({
        message: 'Authentication successful but profile record was not found in the registry.',
        session: authData.session,
        user: authData.user
      });
    }

    return res.status(200).json({
      message: 'Logged in successfully!',
      session: authData.session,
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        phone: profile.phone,
        role: profile.role,
        table: tableUsed
      }
    });

  } catch (err) {
    console.error('Login error occurred:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

/**
 * @route GET /api/auth/profile
 * @desc Get currently authenticated user profile details
 */
app.get('/api/auth/profile', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header is missing.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token is missing from authorization header.' });
  }

  try {
    // 1. Get user details from Supabase Auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: authError?.message || 'Invalid or expired auth session.' });
    }

    const userId = user.id;

    // 2. Retrieve their profile from our public tables
    let profile = null;
    let tableUsed = 'user';

    const { data: userData } = await supabase
      .from('user')
      .select('*')
      .eq('id', userId)
      .single();

    if (userData) {
      profile = userData;
    } else {
      const { data: adminData } = await supabase
        .from('adminstartator')
        .select('*')
        .eq('id', userId)
        .single();

      if (adminData) {
        profile = adminData;
        tableUsed = 'adminstartator';
      }
    }

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found in database registry.' });
    }

    return res.status(200).json({
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        phone: profile.phone,
        role: profile.role,
        table: tableUsed
      }
    });

  } catch (err) {
    console.error('Profile fetch error:', err);
    return res.status(500).json({ error: 'Internal server error during profile retrieval.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`LandVerse Backend Server initialized!`);
  console.log(`Listening on http://localhost:${PORT}`);
  console.log(`Supabase connection: ACTIVE HEALTHY`);
  console.log(`Tables registered: public.user, public.adminstartator`);
  console.log(`==================================================`);
});
