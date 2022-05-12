const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

// middle ware are here
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wzbz9.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// console.log(uri);

const run = async () => {
  try {
    // client start here
    await client.connect();
    const doctorsCollection = client
      .db("doctors_portal")
      .collection("services");

    app.get("/service", async (req, res) => {
      const query = {};
      const cursor = doctorsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
  } finally {
    // client.close()
  }
};

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Doctor's Portal Server is running");
});

app.listen(port, () => {
  console.log(`Server is runnign on ${port}`);
});
