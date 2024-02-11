const {insertUserData,changePassword,authenticateUser, getLiveMessages,getMessages,insertMessages,getUsers,addImageUrlToUser,changeUserStatusOnline,changeUserStatusOffline,getLiveReadMessages,changeMessageStatus}=require('./db.js');
const express=require('express');
const { createServer } = require("http");
const { Server } = require("socket.io");
const { cloudinary } = require('./utils/cloudinary');
const app=express();
const cors=require('cors');
const jwt=require('jsonwebtoken');
const dotenv=require('dotenv');
const cookieParser=require('cookie-parser');
const httpServer = createServer(app);
const io=new Server(httpServer, { cors:{origin:'http://localhost:5173',credentials:true} });
const corsOptions = {
  origin: 'http://localhost:5173', // replace with the origin of your client
  credentials: true, // this allows the session cookie to be sent with the request
};
dotenv.config();
const cookie = require('cookie');

io.use((socket, next) => {
  if (socket.handshake.headers && socket.handshake.headers.cookie) {
    let cookies = cookie.parse(socket.handshake.headers.cookie);
    let token = cookies['token'];
  
    // Now you can use the token...
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if(err){
        console.log('error wrong');
        return;
      } else {
        socket.userid = decoded.userid;
        console.log(socket.userid);
        next();
      }
    });
  }
  else{
    console.log('zero token');
  }
});
io.on('connection',async (socket)=>{
    //console.log(socket.id);
    //console.log(socket.userid)
    changeUserStatusOnline(socket.userid);
    const changeStream=await getLiveMessages(socket,socket.userid);
    const changeReadMessagesStream=await getLiveReadMessages(socket,socket.userid);
    socket.broadcast.emit('online',socket.userid);
    socket.on('disconnect',()=>{
        console.log('goodbye');
        changeStream.close();
        changeReadMessagesStream.close();
        io.emit('offline',socket.userid);
        changeUserStatusOffline(socket.userid);
    })
})
app.use(express.urlencoded({extended:false,limit: '50mb'}));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(cors(corsOptions));
function verifyUser(req,res,next){
    if(req.cookies){
        jwt.verify(req.cookies.token,process.env.JWT_SECRET,(err,decoded)=>{
            if(err){
                return res.json({status:'wrong password'})
            }else{
                req.userid=decoded.userid;
                //console.log(req.userid);
                next()
            }
        })  
        
    }
    else{
        return res.json({status:'no token given'});
    }
}
app.get('/messages',verifyUser,async (req,res)=>{
    const messages=await getMessages(req.userid);
    return res.json(messages);
})
app.post('/sendmessage',verifyUser,async (req,res)=>{
    insertMessages({userid:req.userid,message:req.body.message,receiverid:req.body.receiverid});
    return res.json({status:'suceessfully added message'});
})
app.post('/register',(req,res)=>{
        insertUserData(req.body).then((userId)=>{
        if(userId){
            //console.log(userId);
            return res.cookie('token',jwt.sign({userid:userId},process.env.JWT_SECRET)).json({status:'successfully registered'});;
        }
        else{
           return res.json({status:'failure register again'});
        }

    }) 
})
app.get('/userfriends',verifyUser,async (req,res)=>{
    //console.log('users')
    const users=await getUsers();
    return res.json(users);
})
app.post('/changepassword',verifyUser,async (req,res)=>{
    const authenticateUserperson=await authenticateUser(req.body);
    if(authenticateUserperson.status=='success'){
        const changeuserPassword=await changePassword({userid:req.userid,password:req.body.newpassword});
        if(changeuserPassword){
           return  res.json({status:'change Password successfully'})
        }
        else{
            return res.json({status:'failed to change password'});
        }
    }
    else{
        return res.json({status:'wrong initial password'});
    }   
})
app.post('/profilepic',verifyUser,async (req,res)=>{
    //console.log(req.body.imageUrl);
    const fileStr=req.body.imageUrl;
    const uploadResponse=await cloudinary.uploader.upload(fileStr,{
    upload_preset:'MyChatApp'
    });
    const profileAddPic=await addImageUrlToUser(req.userid,uploadResponse.secure_url);
    if(profileAddPic){
        return res.json({message:'successfully added profile pic',imageUrl:uploadResponse.secure_url});
    }
    else{
        return res.status(500).json({message:'error in adding profile pic'})
    }
})
app.post('/readMessage',verifyUser,async (req,res)=>{
    console.log(req.body._id);
    const readMessage=await changeMessageStatus(req.body._id);
    res.json({message:'success'});
})
app.post('/login',async (req,res)=>{
    try {
         const authenticateUserperson=await authenticateUser(req.body)
    if(authenticateUserperson.status=='success'){
        const userId=authenticateUserperson.results[0]._id;
        //console.log(userId);
        //insertMessages({userid:userId,message:'ODM Baba'})
        const jwtwebToken=jwt.sign({userid:userId},process.env.JWT_SECRET);
        console.log(jwtwebToken);
        return res.cookie('token',jwtwebToken).json({status:'success',username:authenticateUserperson.results[0].username,imageUrl:authenticateUserperson.results[0].imageUrl});
    }
    else if(authenticateUserperson=='wrong password'){
        return res.json({status:'wrong password'})
    }
    else if(authenticateUserperson=='invalid email'){
        return res.json({status:'invalid email'});
    }
    else{
        return res.send('failure');
    }

        
    } catch (error) {
        console.log(error);
        
    }
   
})
const port=process.env.PORT || 4000;
httpServer.listen(port);




