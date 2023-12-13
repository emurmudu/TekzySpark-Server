const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5001;

//Middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dlpgpdj.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const productCollection = client.db('productDB').collection('product');
        const userCollection = client.db('productDB').collection('user');
        const cartItemCollection = client.db('productDB').collection('cartItem');


        app.get('/product', async (req, res) => {
            const cursor = productCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/product/:brand', async (req, res) => {
            const { brand } = req.params;
            const cursor = productCollection.find({ brand: brand });
            const result = await cursor.toArray();
            res.json(result);
            // res.send(result);
        });


        app.get('/product/:brandName', async (req, res) => {
            const { brandName } = req.params;
            const cursor = productCollection.find({ brand: brandName });
            const result = await cursor.toArray();
            res.json(result);
        });


        app.get('/productById/:id', async (req, res) => {
            const productId = req.params.id;
            const product = await productCollection.findOne({ _id: new ObjectId(productId) });

            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            res.json(product);
        });



        //myCart product update:test
        app.get('/productById/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartItemCollection.findOne(query);
            res.send(result);
        })



        app.post('/product', async (req, res) => {
            const newProduct = req.body;
            console.log(newProduct);
            const result = await productCollection.insertOne(newProduct);
            res.send(result);
        })


        // user related api 

        app.post('/user', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await userCollection.insertOne(user);
            res.send(result);
        })


        app.get('/user', async (req, res) => {
            const cursor = userCollection.find();
            const users = await cursor.toArray();
            res.send(users);
        })


        // Add product on cartItem

        app.post("/addToCart", async (req, res) => {

            const { productId, quantity } = req.body;
            const userEmail = req.headers["user-email"];

            if (!userEmail) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const existingCartItem = await cartItemCollection.findOne({
                productId: new ObjectId(productId),
                userEmail,
            });

            if (existingCartItem) {
                existingCartItem.quantity += quantity;
                await cartItemCollection.updateOne(
                    { _id: existingCartItem._id },
                    { $set: { quantity: existingCartItem.quantity } }
                );
                res.json(existingCartItem);
            } else {
                const newCartItem = {
                    productId: new ObjectId(productId),
                    userEmail,
                    quantity,
                };
                const result = await cartItemCollection.insertOne(newCartItem);
                newCartItem._id = result.insertedId;
                res.status(201).json(newCartItem);
            }

        });


        // get cart on myCart
        app.get("/getCart", async (req, res) => {
            const userEmail = req.headers["user-email"];

            if (!userEmail) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const userCartItems = await cartItemCollection
                .aggregate([
                    {
                        $match: { userEmail: userEmail },
                    },
                    {
                        $lookup: {
                            from: "product",
                            localField: "productId",
                            foreignField: "_id",
                            as: "productDetails",
                        },
                    },
                    {
                        $unwind: "$productDetails",
                    },
                    {
                        $project: {
                            _id: 1,
                            quantity: 1,
                            product: "$productDetails",
                        },
                    },
                ])
                .toArray();

            res.json({ cart: userCartItems });
        });


        //Delete operation
        app.delete("/deleteCartItem/:cartItemId", async (req, res) => {
            const userEmail = req.headers["user-email"];
            const cartItemId = req.params.cartItemId;

            if (!userEmail) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            try {
                if (!ObjectId.isValid(cartItemId)) {
                    return res.status(400).json({ error: "Invalid cart item ID" });
                }

                const result = await cartItemCollection.deleteOne({
                    _id: new ObjectId(cartItemId),
                    userEmail: userEmail,
                });

                if (result.deletedCount === 0) {
                    return res.status(404).json({ error: "Cart item not found" });
                }

                res.json({ message: "Cart item deleted successfully" });
            } catch (error) {
                console.error("Error deleting cart item:", error);
                res.status(500).json({ error: "Internal Server Error" });
            }
        });


        // Update product in myCart
        app.put('/updateProduct/:id', async (req, res) => {
            const productId = req.params.id;
            const updatedProduct = req.body;

            try {
                const result = await productCollection.updateOne(
                    { _id: new ObjectId(productId) },
                    { $set: updatedProduct }
                );

                if (result.modifiedCount === 0) {
                    return res.status(404).json({ error: 'Product not found' });
                }

                res.json({ message: 'Product updated successfully' });
            } catch (error) {
                console.error('Error updating product:', error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Mission-10-server is running')
})

app.listen(port, () => {
    console.log(`mission-10-server is running on port, ${port}`)
})