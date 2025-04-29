const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Get the MongoDB connection URI from environment variables
    const mongoURI = process.env.ORDER_MONGO_URI;

    if (!mongoURI) {
      console.error('ORDER_MONGO_URI is not defined in environment variables.');
      process.exit(1);
    }

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // useCreateIndex: true, // Deprecated in newer mongoose versions
      // useFindAndModify: false // Deprecated in newer mongoose versions
    });

    console.log('Order Service MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB; 