const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

// middle ware are here
app.use(cors());
app.use(express.json());
const verifyToken = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).send({ message: "Unauthorize access" });
  }
  const token = header.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
};

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
    const servicesCollection = client
      .db("doctors_portal")
      .collection("services");
    const bookingCollection = client.db("doctors_portal").collection("booking");
    const userCollection = client.db("doctors_portal").collection("user");

    app.get("/service", async (req, res) => {
      const query = {};
      const cursor = servicesCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get all user from database

    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // make admin secure
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email });
      const isAdmin = user.email;
      res.send({ admin: isAdmin });
    });

    // make a user admin role
    app.put("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const requestedAdmin = req.headers.email;
      if (requestedAdmin.role === "admin") {
        const filter = { email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        res.status(403).send({ message: "Forbidden access" });
      }
    });
    // store or update user login info means has or not
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
        expiresIn: "1d",
      });
      res.send({ result, token });
    });

    app.get("/available", async (req, res) => {
      const date = req.query.date;
      // get all service
      const services = await servicesCollection.find().toArray();

      // get booked service
      const query = { date };
      const bookings = await bookingCollection.find(query).toArray();

      // for each service, find booking for that service
      services.forEach((service) => {
        const serviceBookings = bookings.filter(
          (b) => b.treatment === service.name
        );
        const booked = serviceBookings.map((s) => s.slot);
        const available = service.slots.filter((a) => !booked.includes(a));
        service.slots = available;
      });
      res.send(services);
    });

    // show user booking info
    app.get("/booking", verifyToken, async (req, res) => {
      const email = req.query.patient;
      const decodedEmail = req.decoded.email;
      if (decodedEmail === email) {
        const query = { patient: email };
        const result = await bookingCollection.find(query).toArray();
        return res.send(result);
      } else {
        return res.status(401).send({ message: "Forbidden access" });
      }
    });

    // booking user treatment info
    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const query = {
        treatment: booking.treatment,
        date: booking.date,
        patient: booking.patient,
      };
      const exist = await bookingCollection.findOne(query);
      if (exist) {
        return res.send({ success: false, booking: exist });
      }
      const result = await bookingCollection.insertOne(booking);
      res.send({ success: true, result });
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
