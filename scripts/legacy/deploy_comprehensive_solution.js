#!/usr/bin/env node

/**
 * COMPREHENSIVE MULTI-ACCOUNT SOLUTION DEPLOYMENT
 * Safely applies the complete scalable solution
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key',
  DRY_RUN: process.env.DRY_RUN === 'true',
  BACKUP_ENABLED: process.env.BACKUP_ENABLED !== 'false'
};

// Create Supabase client
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

// Logging helpers
const log = (message, data = null) => {
  console.log(`[DEPLOY] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

const error = (message, data = null) => {
  console.error(`[ERROR] ${message}`);
  if (data) console.error(JSON.stringify(data, null, 2));
};

const success = (message, data = null) => {
  console.log(`[SUCCESS] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

// Backup functions
async function backupPostsTable() {
  if (!config.BACKUP_ENABLED) {
    log('Backup disabled, skipping...');
    return true;
  }
  
  log('Creating backup of posts table...');
  
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*');
    
    if (error) {
      error('Failed to backup posts table:', error);
      return false;
    }
    
    const backupFile = `posts_backup_${new Date().toISOString().replace(/:/g, '-')}.json`;
    fs.writeFileSync(backupFile, JSON.stringify(posts, null, 2));
    
    success(`Posts table backed up to ${backupFile}`, { count: posts.length });
    return true;
    
  } catch (err) {
    error('Backup failed:', err);
    return false;
  }
}

// Pre-deployment checks
async function preDeploymentChecks() {
  log('Running pre-deployment checks...');
  
  try {
    // Check database connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (connectionError) {
      error('Database connection failed:', connectionError);
      return false;
    }
    
    // Check if posts table exists
    const { data: postsTable, error: postsError } = await supabase
      .from('posts')
      .select('id')
      .limit(1);
    
    if (postsError) {
      error('Posts table not accessible:', postsError);
      return false;
    }
    
    // Check if artist profiles exist
    const { data: artistProfiles, error: artistError } = await supabase
      .from('artist_profiles')
      .select('id')
      .limit(1);
    
    if (artistError) {
      error('Artist profiles table not accessible:', artistError);
      return false;
    }
    
    success('Pre-deployment checks passed');
    return true;
    
  } catch (err) {
    error('Pre-deployment checks failed:', err);
    return false;
  }
}

// Apply SQL migration
async function applySQLMigration() {
  log('Applying SQL migration...');
  
  try {
    const sqlFilePath = path.join(__dirname, 'COMPREHENSIVE_SCALABLE_SOLUTION.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      error('SQL file not found:', sqlFilePath);
      return false;
    }
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    if (config.DRY_RUN) {
      log('DRY RUN: Would execute SQL migration (not actually running)');
      return true;
    }
    
    // Split SQL into chunks to avoid timeouts
    const sqlChunks = sqlContent.split('-- =====================================================');
    
    for (let i = 0; i < sqlChunks.length; i++) {
      const chunk = sqlChunks[i].trim();
      if (!chunk) continue;
      
      log(`Executing SQL chunk ${i + 1}/${sqlChunks.length}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: chunk
      });
      
      if (error) {
        error(`SQL chunk ${i + 1} failed:`, error);
        return false;
      }
      
      log(`SQL chunk ${i + 1} completed successfully`);
    }
    
    success('SQL migration applied successfully');
    return true;
    
  } catch (err) {
    error('SQL migration failed:', err);
    return false;
  }
}

// Verify deployment
async function verifyDeployment() {
  log('Verifying deployment...');
  
  try {
    // Check that new columns exist in posts table
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('posted_as_profile_id, posted_as_account_type, account_display_name')
      .limit(1);
    
    if (postsError) {
      error('Failed to verify posts table columns:', postsError);
      return false;
    }
    
    // Check that user_accounts table exists
    const { data: accounts, error: accountsError } = await supabase
      .from('user_accounts')
      .select('id')
      .limit(1);
    
    if (accountsError) {
      error('user_accounts table not found:', accountsError);
      return false;
    }
    
    // Check that functions exist
    const { data: accountFunction, error: functionError } = await supabase
      .rpc('get_or_create_account', {
        p_user_id: 'test',
        p_account_type: 'primary',
        p_profile_id: null
      });
    
    // We expect this to fail with user not found, but function should exist
    if (functionError && !functionError.message.includes('profile not found')) {
      error('get_or_create_account function not working:', functionError);
      return false;
    }
    
    success('Deployment verification passed');
    return true;
    
  } catch (err) {
    error('Deployment verification failed:', err);
    return false;
  }
}

// Rollback function
async function rollback() {
  log('Rolling back deployment...');
  
  try {
    // Drop the new columns and tables
    const rollbackSQL = `
      -- Remove new columns from posts table
      ALTER TABLE posts DROP COLUMN IF EXISTS posted_as_profile_id;
      ALTER TABLE posts DROP COLUMN IF EXISTS posted_as_account_type;
      ALTER TABLE posts DROP COLUMN IF EXISTS account_display_name;
      ALTER TABLE posts DROP COLUMN IF EXISTS account_username;
      ALTER TABLE posts DROP COLUMN IF EXISTS account_avatar_url;
      ALTER TABLE posts DROP COLUMN IF EXISTS type;
      ALTER TABLE posts DROP COLUMN IF EXISTS visibility;
      ALTER TABLE posts DROP COLUMN IF EXISTS location;
      ALTER TABLE posts DROP COLUMN IF EXISTS hashtags;
      ALTER TABLE posts DROP COLUMN IF EXISTS media_urls;
      
      -- Drop user_accounts table
      DROP TABLE IF EXISTS user_accounts;
      
      -- Drop functions
      DROP FUNCTION IF EXISTS get_or_create_account;
      DROP FUNCTION IF EXISTS get_account_display_info_by_context;
    `;
    
    if (config.DRY_RUN) {
      log('DRY RUN: Would execute rollback (not actually running)');
      return true;
    }
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: rollbackSQL
    });
    
    if (error) {
      error('Rollback failed:', error);
      return false;
    }
    
    success('Rollback completed successfully');
    return true;
    
  } catch (err) {
    error('Rollback failed:', err);
    return false;
  }
}

// Main deployment function
async function deployComprehensiveSolution() {
  console.log('🚀 COMPREHENSIVE MULTI-ACCOUNT SOLUTION DEPLOYMENT');
  console.log('==================================================');
  
  if (config.DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }
  
  try {
    // Step 1: Pre-deployment checks
    if (!(await preDeploymentChecks())) {
      error('Pre-deployment checks failed. Aborting deployment.');
      return false;
    }
    
    // Step 2: Create backup
    if (!(await backupPostsTable())) {
      error('Backup failed. Aborting deployment.');
      return false;
    }
    
    // Step 3: Apply SQL migration
    if (!(await applySQLMigration())) {
      error('SQL migration failed. Starting rollback...');
      await rollback();
      return false;
    }
    
    // Step 4: Verify deployment
    if (!(await verifyDeployment())) {
      error('Deployment verification failed. Starting rollback...');
      await rollback();
      return false;
    }
    
    console.log('\n🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!');
    console.log('=====================================');
    console.log('✅ Database schema updated');
    console.log('✅ Account management functions created');
    console.log('✅ Existing data migrated');
    console.log('✅ Performance optimizations applied');
    console.log('✅ All verification checks passed');
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Test the post creation API');
    console.log('2. Test the feed API');
    console.log('3. Run the comprehensive test suite');
    console.log('4. Monitor system performance');
    
    return true;
    
  } catch (err) {
    error('Deployment failed:', err);
    console.log('\n🔄 Starting rollback...');
    await rollback();
    return false;
  }
}

// Command line interface
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'deploy':
      await deployComprehensiveSolution();
      break;
    case 'rollback':
      await rollback();
      break;
    case 'verify':
      await verifyDeployment();
      break;
    case 'backup':
      await backupPostsTable();
      break;
    default:
      console.log('Usage: node deploy_comprehensive_solution.js <command>');
      console.log('Commands:');
      console.log('  deploy   - Deploy the comprehensive solution');
      console.log('  rollback - Rollback the deployment');
      console.log('  verify   - Verify the deployment');
      console.log('  backup   - Create backup of posts table');
      console.log('');
      console.log('Environment variables:');
      console.log('  DRY_RUN=true           - Run without making changes');
      console.log('  BACKUP_ENABLED=false   - Disable backup creation');
      break;
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { deployComprehensiveSolution, rollback, verifyDeployment }; 