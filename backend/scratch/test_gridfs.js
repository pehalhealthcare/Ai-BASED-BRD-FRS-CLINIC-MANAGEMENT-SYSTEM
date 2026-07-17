const mongoose = require('mongoose');
const gridFsStorage = require('../src/common/utils/gridFsStorage.service');

async function test() {
  const uri = 'mongodb+srv://Kaishav:Kaishav123@cms.mbzaovj.mongodb.net/ai-cms?retryWrites=true&w=majority';
  await mongoose.connect(uri);
  console.log('Connected to DB');

  try {
    const dummyBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    console.log('Testing GridFS upload...');
    const fileRef = await gridFsStorage.uploadBase64(dummyBase64, 'test_file.png');
    console.log('Upload success! File reference:', fileRef);

    if (fileRef) {
      console.log('Testing GridFS delete...');
      await gridFsStorage.deleteFile(fileRef);
      console.log('Delete success!');
    }
  } catch (err) {
    console.error('GridFS Error:', err.message, err.stack);
  }

  await mongoose.disconnect();
}

test().catch(console.error);
