const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

module.exports = (pool) => {
  // Create Stripe Connect account for host
  router.post('/onboard', async (req, res) => {
    try {
      const { user_id, email } = req.body;
      
      console.log('Creating Stripe Connect Express account for user:', user_id);
      
      // Check if user already has a Stripe account
      const { rows } = await pool.query(
        'SELECT stripe_account FROM users WHERE id = $1',
        [user_id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const user = rows[0];
      
      // If user already has a Stripe account, return existing onboarding link
      if (user.stripe_account) {
        console.log('User already has Stripe account:', user.stripe_account);
        
        try {
          // Verify the account still exists in Stripe
          const existingAccount = await stripe.accounts.retrieve(user.stripe_account);
          
          // Create account link for existing account
          const accountLink = await stripe.accountLinks.create({
            account: user.stripe_account,
            refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-listings?tab=stripe`,
            return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-listings?tab=stripe`,
            type: 'account_onboarding',
          });
          
          return res.json({ 
            url: accountLink.url,
            account_id: user.stripe_account,
            is_existing: true
          });
        } catch (stripeError) {
          console.log('Existing Stripe account not found, creating new one:', stripeError.message);
          // Account doesn't exist in Stripe, clear it from database
          await pool.query(
            'UPDATE users SET stripe_account = NULL WHERE id = $1',
            [user_id]
          );
        }
      }
      
      // Create new Stripe Connect Express account
      const account = await stripe.accounts.create({
        type: 'express', // Changed from 'standard' to 'express'
        email: email || user.email,
        metadata: { 
          user_id: user_id,
          platform: 'subly'
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          url: process.env.FRONTEND_URL || 'http://localhost:3000',
          mcc: '7399', // Computer Software Stores
        },
      });
      
      console.log('Created Stripe Connect Express account:', account.id);
      
      // Save account ID to user record
      await pool.query(
        'UPDATE users SET stripe_account = $1 WHERE id = $2',
        [account.id, user_id]
      );
      
      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-listings?tab=stripe`,
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-listings?tab=stripe`,
        type: 'account_onboarding',
      });
      
      res.json({ 
        url: accountLink.url,
        account_id: account.id,
        is_existing: false
      });
      
    } catch (err) {
      console.error('Error creating Stripe Connect account:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get host's Stripe account status
  router.get('/account/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const { rows } = await pool.query(
        'SELECT stripe_account FROM users WHERE id = $1',
        [userId]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const user = rows[0];
      
      if (!user.stripe_account) {
        return res.json({ 
          connected: false,
          account_id: null,
          status: 'not_connected'
        });
      }
      
      // Get account details from Stripe
      const account = await stripe.accounts.retrieve(user.stripe_account);
      
      res.json({
        connected: true,
        account_id: account.id,
        status: account.charges_enabled ? 'active' : 'pending',
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: account.requirements
      });
      
    } catch (err) {
      console.error('Error getting Stripe account status:', err);
      
      // If account not found in Stripe, clear it from database
      if (err.code === 'resource_missing') {
        const { userId } = req.params;
        await pool.query(
          'UPDATE users SET stripe_account = NULL WHERE id = $1',
          [userId]
        );
        
        return res.json({ 
          connected: false,
          account_id: null,
          status: 'not_connected'
        });
      }
      
      res.status(500).json({ error: err.message });
    }
  });

  // Create account link for existing account (for re-onboarding)
  router.post('/account-link/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const { rows } = await pool.query(
        'SELECT stripe_account FROM users WHERE id = $1',
        [userId]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const user = rows[0];
      
      if (!user.stripe_account) {
        return res.status(400).json({ error: 'No Stripe account found for user' });
      }
      
      const accountLink = await stripe.accountLinks.create({
        account: user.stripe_account,
        refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-listings?tab=stripe`,
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-listings?tab=stripe`,
        type: 'account_onboarding',
      });
      
      res.json({ url: accountLink.url });
      
    } catch (err) {
      console.error('Error creating account link:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete Stripe account (for resetting)
  router.delete('/account/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const { rows } = await pool.query(
        'SELECT stripe_account FROM users WHERE id = $1',
        [userId]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const user = rows[0];
      
      if (!user.stripe_account) {
        return res.json({ message: 'No Stripe account to delete' });
      }
      
      try {
        // Delete the Stripe account
        await stripe.accounts.del(user.stripe_account);
        console.log('Deleted Stripe account:', user.stripe_account);
      } catch (stripeError) {
        console.log('Stripe account not found or already deleted:', stripeError.message);
      }
      
      // Clear from database
      await pool.query(
        'UPDATE users SET stripe_account = NULL WHERE id = $1',
        [userId]
      );
      
      res.json({ message: 'Stripe account deleted successfully' });
      
    } catch (err) {
      console.error('Error deleting Stripe account:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Reset Stripe account (delete and recreate)
  router.post('/reset/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { email } = req.body;
      
      console.log('Resetting Stripe Express account for user:', userId);
      
      // First delete existing account
      const { rows } = await pool.query(
        'SELECT stripe_account FROM users WHERE id = $1',
        [userId]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const user = rows[0];
      
      if (user.stripe_account) {
        try {
          await stripe.accounts.del(user.stripe_account);
          console.log('Deleted existing Stripe account:', user.stripe_account);
        } catch (stripeError) {
          console.log('Stripe account not found or already deleted:', stripeError.message);
        }
      }
      
      // Clear from database
      await pool.query(
        'UPDATE users SET stripe_account = NULL WHERE id = $1',
        [userId]
      );
      
      // Create new Express account
      const account = await stripe.accounts.create({
        type: 'express', // Using Express instead of Standard
        email: email,
        metadata: { 
          user_id: userId,
          platform: 'subly'
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          url: process.env.FRONTEND_URL || 'http://localhost:3000',
          mcc: '7399', // Computer Software Stores
        },
      });
      
      console.log('Created new Stripe Connect Express account:', account.id);
      
      // Save new account ID
      await pool.query(
        'UPDATE users SET stripe_account = $1 WHERE id = $2',
        [account.id, userId]
      );
      
      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-listings?tab=stripe`,
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-listings?tab=stripe`,
        type: 'account_onboarding',
      });
      
      res.json({ 
        url: accountLink.url,
        account_id: account.id,
        message: 'Stripe Express account reset successfully'
      });
      
    } catch (err) {
      console.error('Error resetting Stripe account:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}; 