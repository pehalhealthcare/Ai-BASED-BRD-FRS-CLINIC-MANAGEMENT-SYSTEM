const fs = require('fs');
const readline = require('readline');

const logPaths = [
  'C:\\Users\\Kaishav Gupta\\.gemini\\antigravity-ide\\brain\\e10b9ed4-b869-470a-a913-dd9b6582e0b7\\.system_generated\\logs\\transcript_full.jsonl',
  'C:\\Users\\Kaishav Gupta\\.gemini\\antigravity-ide\\brain\\20426284-9e0c-439d-bcfd-6da55785d195\\.system_generated\\logs\\transcript_full.jsonl',
  'C:\\Users\\Kaishav Gupta\\.gemini\\antigravity-ide\\brain\\146f626a-3587-4046-8971-ef4a0044924c\\.system_generated\\logs\\transcript_full.jsonl'
];

async function run() {
  let matches = [];
  for (const logPath of logPaths) {
    if (!fs.existsSync(logPath)) continue;
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.toLowerCase().includes('otp') && line.includes('DoctorDashboardPage.jsx')) {
        try {
          const obj = JSON.parse(line);
          const toolCall = obj.tool_calls?.[0];
          if (toolCall && toolCall.name === 'replace_file_content' && toolCall.args?.ReplacementContent) {
            matches.push({
              target: toolCall.args.TargetContent,
              replace: toolCall.args.ReplacementContent,
              desc: toolCall.args.Description
            });
          }
        } catch (e) {}
      }
    }
  }

  console.log(`Found ${matches.length} code modifications for OTP`);
  fs.writeFileSync('C:\\Users\\Kaishav Gupta\\.gemini\\antigravity-ide\\brain\\e10b9ed4-b869-470a-a913-dd9b6582e0b7\\scratch\\otp_modifications.txt', JSON.stringify(matches, null, 2));
}

run().catch(console.error);
