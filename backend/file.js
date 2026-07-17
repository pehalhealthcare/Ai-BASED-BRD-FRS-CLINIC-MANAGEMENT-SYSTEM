import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGO_URI_ATLAS;

console.log(mongoUri);


try {
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");
} catch (err) {
  console.log("Error connecting to MongoDB", err);
}


// const models =


const collections = await mongoose.connection.db.listCollections().toArray();

for (const col of collections) {
  const collectionName = col.name;

  if (collectionName === "appointments") {
    const result = await mongoose.connection.db.collection(collectionName).deleteMany({});
    console.log(result);

  }
}
