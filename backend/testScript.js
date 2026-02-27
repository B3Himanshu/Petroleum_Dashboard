/**
 * Postcode Validation and Update Script
 * Validates and updates postcodes in the database to match the document
 */

import pool from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

// Expected postcodes from the document (Site ID -> Postcode mapping)
const expectedPostcodes = {
  6: 'SO18 1AR',   // Manor Service Station
  7: 'GU34 4JH',   // Hen And Chicken SS
  9: 'EX8 2NE',    // Salterton Road SS
  10: 'TR16 6HT',  // Lanner Moor Garage
  11: 'LU5 4LW',   // Luton Road SS
  14: 'PE19 1JZ',  // Kings Lane SS
  17: 'PE7 1RO',   // Delph SS
  18: 'PE7 1NJ',   // Saxon Autopoint SS
  19: 'WA9 4RX',   // Jubits Lane SS
  20: 'WA9 3EZ',   // Worsley Brow
  23: 'PE13 4AA',  // Auto Pitstop
  24: 'HD6 1QH',   // Crown SS
  25: 'OL8 1SY',   // Marsland SS
  29: 'WA5 7TY',   // Gemini SS
  30: 'DE45 1AW',  // Park View
  31: 'ST15 0PT',  // Filleybrook SS
  33: 'B70 0YA',   // Swan Connect
  34: 'DT5 1BW',   // Portland
  35: 'GL16 8QQ',  // Lower Lane
  36: 'WR11 7QP',  // Vale SS
  37: 'B29 7NY',   // Kensington SS
  38: 'RH10 9TA',  // County Oak SS
  39: 'DY3 1RA',   // Kings Of Sedgley
  40: 'ST20 0EZ',  // Gnosall SS
  41: 'SY5 0BE',   // Minsterley SS
  42: 'BB9 7AJ',   // Nelson SS
  43: 'BA21 4EH',  // Yeovil SS
  44: 'S60 2XG',   // Canklow SS
  45: 'IP31 2BZ',  // Stanton Self Service (or NG9 2BZ - need to verify)
};

/**
 * Validate postcodes in database against expected values
 */
async function validatePostcodes() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Starting Postcode Validation...\n');
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Get all sites from database
    const sitesQuery = `
      SELECT site_code, site_name, post_code
      FROM sites
      WHERE is_active = true
        AND site_code > 1
      ORDER BY site_code;
    `;
    
    const result = await client.query(sitesQuery);
    const sites = result.rows;
    
    console.log(`📊 Found ${sites.length} active sites in database\n`);
    
    const mismatches = [];
    const matches = [];
    const notInDocument = [];
    const notInDatabase = [];
    
    // Check each site
    for (const site of sites) {
      const siteCode = site.site_code;
      const dbPostcode = site.post_code?.trim() || '';
      const expectedPostcode = expectedPostcodes[siteCode];
      
      if (expectedPostcode) {
        // Normalize postcodes for comparison (remove spaces, uppercase)
        const normalizedDb = dbPostcode.replace(/\s+/g, '').toUpperCase();
        const normalizedExpected = expectedPostcode.replace(/\s+/g, '').toUpperCase();
        
        if (normalizedDb === normalizedExpected) {
          matches.push({
            siteCode,
            siteName: site.site_name,
            postcode: dbPostcode,
            status: '✅ MATCH'
          });
        } else {
          mismatches.push({
            siteCode,
            siteName: site.site_name,
            dbPostcode: dbPostcode || '(empty)',
            expectedPostcode,
            status: '❌ MISMATCH'
          });
        }
      } else {
        notInDocument.push({
          siteCode,
          siteName: site.site_name,
          postcode: dbPostcode || '(empty)',
          status: '⚠️ NOT IN DOCUMENT'
        });
      }
    }
    
    // Check for sites in document but not in database
    const dbSiteCodes = new Set(sites.map(s => s.site_code));
    for (const [siteCode, postcode] of Object.entries(expectedPostcodes)) {
      if (!dbSiteCodes.has(parseInt(siteCode))) {
        notInDatabase.push({
          siteCode: parseInt(siteCode),
          expectedPostcode: postcode,
          status: '⚠️ NOT IN DATABASE'
        });
      }
    }
    
    // Print results
    console.log('✅ MATCHES:');
    console.log('───────────────────────────────────────────────────────────────');
    if (matches.length > 0) {
      matches.forEach(m => {
        console.log(`  ${m.status} | Site ${m.siteCode}: ${m.siteName}`);
        console.log(`           Postcode: ${m.postcode}`);
      });
    } else {
      console.log('  No matches found');
    }
    console.log(`\n  Total Matches: ${matches.length}\n`);
    
    console.log('❌ MISMATCHES (Need Update):');
    console.log('───────────────────────────────────────────────────────────────');
    if (mismatches.length > 0) {
      mismatches.forEach(m => {
        console.log(`  ${m.status} | Site ${m.siteCode}: ${m.siteName}`);
        console.log(`           Database:  ${m.dbPostcode}`);
        console.log(`           Expected:  ${m.expectedPostcode}`);
      });
    } else {
      console.log('  No mismatches found - all postcodes match!');
    }
    console.log(`\n  Total Mismatches: ${mismatches.length}\n`);
    
    if (notInDocument.length > 0) {
      console.log('⚠️ SITES NOT IN DOCUMENT:');
      console.log('───────────────────────────────────────────────────────────────');
      notInDocument.forEach(s => {
        console.log(`  ${s.status} | Site ${s.siteCode}: ${s.siteName} - ${s.postcode}`);
      });
      console.log(`\n  Total: ${notInDocument.length}\n`);
    }
    
    if (notInDatabase.length > 0) {
      console.log('⚠️ SITES IN DOCUMENT BUT NOT IN DATABASE:');
      console.log('───────────────────────────────────────────────────────────────');
      notInDatabase.forEach(s => {
        console.log(`  ${s.status} | Site ${s.siteCode} - Expected: ${s.expectedPostcode}`);
      });
      console.log(`\n  Total: ${notInDatabase.length}\n`);
    }
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n📊 SUMMARY:`);
    console.log(`   ✅ Matches:        ${matches.length}`);
    console.log(`   ❌ Mismatches:     ${mismatches.length}`);
    console.log(`   ⚠️  Not in doc:     ${notInDocument.length}`);
    console.log(`   ⚠️  Not in DB:      ${notInDatabase.length}`);
    console.log(`   📋 Total checked:   ${sites.length}`);
    
    return {
      matches,
      mismatches,
      notInDocument,
      notInDatabase
    };
    
  } catch (error) {
    console.error('❌ Error validating postcodes:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update postcodes in database to match expected values
 * @param {boolean} dryRun - If true, only shows what would be updated without making changes
 */
async function updatePostcodes(dryRun = true) {
  const client = await pool.connect();
  
  try {
    console.log('\n🔄 Starting Postcode Update...\n');
    console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes will be made)' : '✏️  LIVE UPDATE (changes will be saved)'}\n`);
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Get validation results
    const { mismatches } = await validatePostcodes();
    
    if (mismatches.length === 0) {
      console.log('\n✅ All postcodes are already correct! No updates needed.\n');
      return;
    }
    
    console.log(`\n📝 Preparing to update ${mismatches.length} postcode(s)...\n`);
    
    const updates = [];
    
    for (const mismatch of mismatches) {
      const updateQuery = `
        UPDATE sites
        SET post_code = $1
        WHERE site_code = $2
        RETURNING site_code, site_name, post_code;
      `;
      
      if (dryRun) {
        console.log(`  [DRY RUN] Would update Site ${mismatch.siteCode}: ${mismatch.siteName}`);
        console.log(`            From: ${mismatch.dbPostcode}`);
        console.log(`            To:   ${mismatch.expectedPostcode}`);
        updates.push({
          siteCode: mismatch.siteCode,
          siteName: mismatch.siteName,
          oldPostcode: mismatch.dbPostcode,
          newPostcode: mismatch.expectedPostcode,
          status: 'would update'
        });
      } else {
        try {
          const result = await client.query(updateQuery, [
            mismatch.expectedPostcode,
            mismatch.siteCode
          ]);
          
          if (result.rows.length > 0) {
            console.log(`  ✅ Updated Site ${mismatch.siteCode}: ${mismatch.siteName}`);
            console.log(`            From: ${mismatch.dbPostcode}`);
            console.log(`            To:   ${mismatch.expectedPostcode}`);
            updates.push({
              siteCode: mismatch.siteCode,
              siteName: mismatch.siteName,
              oldPostcode: mismatch.dbPostcode,
              newPostcode: mismatch.expectedPostcode,
              status: 'updated'
            });
          }
        } catch (error) {
          console.error(`  ❌ Failed to update Site ${mismatch.siteCode}:`, error.message);
          updates.push({
            siteCode: mismatch.siteCode,
            siteName: mismatch.siteName,
            oldPostcode: mismatch.dbPostcode,
            newPostcode: mismatch.expectedPostcode,
            status: 'error',
            error: error.message
          });
        }
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`\n📊 UPDATE SUMMARY:`);
    console.log(`   ${dryRun ? 'Would update' : 'Updated'}: ${updates.filter(u => u.status === (dryRun ? 'would update' : 'updated')).length}`);
    if (updates.some(u => u.status === 'error')) {
      console.log(`   ❌ Errors: ${updates.filter(u => u.status === 'error').length}`);
    }
    
    if (!dryRun) {
      console.log('\n✅ Postcode update completed!');
    } else {
      console.log('\n💡 To apply these changes, run with dryRun = false');
    }
    
    return updates;
    
  } catch (error) {
    console.error('❌ Error updating postcodes:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Postcode Validation and Update Script\n');
    console.log('This script will:');
    console.log('  1. Validate postcodes in database against document');
    console.log('  2. Show mismatches');
    console.log('  3. Optionally update postcodes to match document\n');
    
    // First, validate
    await validatePostcodes();
    
    // Then, update the postcodes
    console.log('\n\n');
    await updatePostcodes(false); // dryRun = false - actually update the database
    
    console.log('\n\n✅ Postcode update process completed!\n');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run the script
main();
