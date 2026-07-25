const { connectDB } = require('d:/Office_work/CMS/backend/src/config/database');
const Provider = require('d:/Office_work/CMS/backend/src/modules/providers/provider.model');

async function run() {
  await connectDB();
  const provider = await Provider.findById('6a5a6ee1b652682b5d78133a');
  console.log("PROVIDER FOUND:", JSON.stringify(provider, null, 2));
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
