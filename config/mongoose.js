require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URL, {
}).then(function(){
    console.log("Connected with Local Database");
}).catch(function(error){
    console.error("Error connecting to database:", error);
});

