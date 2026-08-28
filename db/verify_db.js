const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Dynamic import of pg-mem
let pgmem;
try {
    pgmem = require('pg-mem');
} catch (e) {
    console.error('Error: "pg-mem" is not installed.');
    console.error('Please run "npm install pg-mem" first to install the validator dependency.');
    process.exit(1);
}

console.log('Initializing in-memory PostgreSQL engine...');
const db = pgmem.newDb();

// Register the standard uuid-ossp extension mock
db.registerExtension('uuid-ossp', (schema) => {
    // uuid-ossp mock setup
});

// Register gen_random_uuid() function for standard UUID generation
db.public.registerFunction({
    name: 'gen_random_uuid',
    args: [],
    returns: pgmem.DataType.uuid,
    implementation: () => crypto.randomUUID(),
});

// Read schema and seed files
const schemaPath = path.join(__dirname, 'schema.sql');
const seedPath = path.join(__dirname, 'seed.sql');

console.log(`Reading schema file: ${schemaPath}`);
const schemaSql = fs.readFileSync(schemaPath, 'utf8');

console.log(`Reading seed file: ${seedPath}`);
const seedSql = fs.readFileSync(seedPath, 'utf8');

try {
    console.log('Executing schema.sql...');
    db.public.none(schemaSql);
    console.log('✓ Schema executed successfully (Tables, constraints, and indexes compiled).');

    console.log('Executing seed.sql...');
    db.public.none(seedSql);
    console.log('✓ Seed executed successfully (Synthetic data inserted successfully).');

    // Run structural integrity test queries
    console.log('Running schema integrity queries...');

    const userCount = db.public.one('SELECT count(*)::int as count FROM users').count;
    const agentCount = db.public.one('SELECT count(*)::int as count FROM agents').count;
    const sessionCount = db.public.one('SELECT count(*)::int as count FROM sessions').count;
    const eventCount = db.public.one('SELECT count(*)::int as count FROM agent_events').count;
    const decisionCount = db.public.one('SELECT count(*)::int as count FROM security_decisions').count;
    const alertCount = db.public.one('SELECT count(*)::int as count FROM alerts').count;
    const chainCount = db.public.one('SELECT count(*)::int as count FROM attack_chains').count;
    const simCount = db.public.one('SELECT count(*)::int as count FROM simulation_runs').count;

    console.log(`\nVerification Stats:`);
    console.log(`- Users: ${userCount}`);
    console.log(`- Agents: ${agentCount}`);
    console.log(`- Sessions: ${sessionCount}`);
    console.log(`- Attack Chains: ${chainCount}`);
    console.log(`- Agent Events: ${eventCount}`);
    console.log(`- Security Decisions: ${decisionCount}`);
    console.log(`- Alerts: ${alertCount}`);
    console.log(`- Simulation Runs: ${simCount}`);

    console.log('\nVerifying Compound Attack chain relations...');
    const result = db.public.many(`
        SELECT 
            ae.event_id_str, 
            ae.action, 
            ae.tool, 
            ae.resource,
            sd.decision,
            sd.trust_score,
            ac.chain_id_str
        FROM agent_events ae
        JOIN security_decisions sd ON ae.id = sd.event_id
        JOIN attack_chains ac ON ae.attack_chain_id = ac.id
        WHERE ac.chain_id_str = 'chain_abc_sim_01'
        ORDER BY ae.timestamp ASC
    `);

    console.log(`\nFound ${result.length} correlated events in chain 'chain_abc_sim_01':`);
    result.forEach((row, index) => {
        console.log(`Stage ${index + 1}: ${row.action} on ${row.tool} (${row.resource}) -> Verdict: ${row.decision} (Trust Score: ${row.trust_score})`);
    });

    console.log('\n✓ Database Schema and Seed Data verified successfully.');
    process.exit(0);

} catch (error) {
    console.error('✗ Verification failed with error:');
    console.error(error);
    process.exit(1);
}
