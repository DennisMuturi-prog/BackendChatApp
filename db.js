const dotenv=require('dotenv');
dotenv.config();
const bcrypt = require('bcrypt');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const client = new MongoClient(process.env.CONNECTIONSTRING, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function connectToDb() {
  try {
    await client.connect(); 
    
  } catch (error) {
    console.log(error);
    process.exit(1); 
  }
    
}

async function closeDb() {
    await client.close();
}

async function changePassword({userid,password}) {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    connectToDb();
    const objectifiedId=new ObjectId(userid);
    const hash = await bcrypt.hash(password,10);
    // Store hash in your password DB.
    const results = await client.db("chatApp").collection('userData').updateOne({_id:objectifiedId},{$set:{password:hash}});
    console.log(results);
    return results;  
  }  catch (error) {
    console.log('Error in ChangePassword:', error);
  }
}
async function insertUserData({email,username,password}) {
  try {
    // Connect the client to the server (optional starting in v4.7)
    connectToDb();
    const hash = await bcrypt.hash(password,10);
    // Store hash in your password DB.
    const results = await client.db("chatApp").collection('userData').insertOne({email:email,username:username,password:hash,status:'offline'});
    return results.insertedId;
  }  catch (error) {
    console.log('Error in insertUserUserData:', error);
  }
}
async function authenticateUser({email,password}) {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    connectToDb();
    const dbresults=await client.db("chatApp").collection('userData').find({email:email}).toArray();
    if(dbresults.length){
        const match = await bcrypt.compare(password, dbresults[0].password);
        if(match){
            console.log('successful login');
            //console.log(dbresults);
            return {results:dbresults,status:'success'};
        }
        else{
            console.log('wrong password')
            return 'wrong password'
        }
    }else{
        console.log('invalid email');  
        return 'invalid email'
    }
    
  }  catch (error) {
    console.log('Error in authenticateUser:', error);
  }
}
//insertUserData().catch(console.dir);
async function getLiveMessages(socket,userid){
  try {
    connectToDb();
    const collection=client.db('chatApp').collection('messages');
    const objectifiedId=new ObjectId(userid);
    const changeStream = collection.watch([{$match:{'operationType':'insert','fullDocument.receiverid':objectifiedId}}]);
    changeStream.on('change', (next) => {
      socket.emit('db-changes',{message:next.fullDocument.message,senderid:next.fullDocument.senderid,time:next.fullDocument.time});
      console.log(next);
    });
    return changeStream;
    
  } catch (error) {
    console.log(error);
  }
    
}
async function getMessages(userid){
  try {
    // Connect the client to the server	(optional starting in v4.7)
    connectToDb();
    const objectifiedId=new ObjectId(userid);
    const results=await client.db("chatApp").collection('messages').find({ $or: [ { senderid:objectifiedId }, { receiverid: objectifiedId} ]}).toArray();
    //console.log(results);
    return results;
    
  }  catch (error) {
    console.error('Error in getMessages:', error);
  }

}
async function getUsers(){
  try {
    // Connect the client to the server	(optional starting in v4.7)
    connectToDb();
    //const results=await client.db("chatApp").collection('userData').find().toArray();
    const results = await client.db("chatApp").collection('userData').find({}, { projection: { _id: 1, username: 1 ,imageUrl:1,status:1} }).toArray();
    //console.log(results);
    return results;
    
  }  catch (error) {
    console.error('Error in getusers:', error);
  }

}
async function insertMessages({userid,message,receiverid}) {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    connectToDb();
    const objectifiedId=new ObjectId(userid);
    const objectifiedReceiverId=new ObjectId(receiverid);
    const results=await client.db("chatApp").collection('messages').insertOne({senderid:objectifiedId,message:message,receiverid:objectifiedReceiverId,time:new Date()});
    console.log(results); 
  }  catch (error) {
    console.error('Error in insertMessages:', error);
  }
}
async function addImageUrlToUser(userid, imageUrl) {
  try {
    // Connect the client to the server
    await connectToDb();
    const objectifiedId = new ObjectId(userid);
    const result = await client.db("chatApp").collection('userData').updateOne(
      { _id: objectifiedId },
      { $set: { imageUrl: imageUrl } }
    );
    return result;
  } catch (error) {
    console.error('Error in addImageUrlToUser:', error);
  }
}
async function changeUserStatusOnline(userid) {
  try {
    // Connect the client to the server
    await connectToDb();
    const objectifiedId = new ObjectId(userid);
    const result = await client.db("chatApp").collection('userData').updateOne(
      { _id: objectifiedId },
      { $set: { status: 'online' } }
    );
    return result;
  } catch (error) {
    console.error('Error in changeUserStatusOnline:', error);
  }
}
async function changeUserStatusOffline(userid) {
  try {
    // Connect the client to the server
    await connectToDb();
    const objectifiedId = new ObjectId(userid);
    const result = await client.db("chatApp").collection('userData').updateOne(
      { _id: objectifiedId },
      { $set: { status: 'offline' } }
    );
    return result;
  } catch (error) {
    console.error('Error in changeUserStatusOffline:', error);
  }
}

//getUsers();
//insertUserData({username:'Uhuru',password:'Kenyatta'});
//rambo();
//getMessages('dennis');
//insertMessages({userid:'65a6a534c9ba55595a231a61',message:'agwambo'})
//changePassword({userid:'65a6a534c9ba55595a231a61',password:'BrownOwino'})
//authenticateUser({username:'BabuOwin',password:'BrownOwino'})
//insertMessages({userid:'65a6a534c9ba55595a231a61',message:'sasa Owino'})
//rambo(null,'65a6a534c9ba55595a231a61'); 

module.exports={insertUserData,changePassword,authenticateUser,getLiveMessages,getMessages,insertMessages,getUsers,addImageUrlToUser,changeUserStatusOnline,changeUserStatusOffline,connectToDb}

