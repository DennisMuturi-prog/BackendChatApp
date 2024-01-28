const {insertUserData,changePassword,authenticateUser, getLiveMessages,getMessages,insertMessages,getUsers,addImageUrlToUser}=require('./db.js');
const io=require('socket.io')(3000,{cors:{origin:'http://localhost:5173'}});
const express=require('express');
const { cloudinary } = require('./utils/cloudinary');
const app=express();
const cors=require('cors');
const jwt=require('jsonwebtoken');
const dotenv=require('dotenv');
const cookieParser=require('cookie-parser');
const corsOptions = {
  origin: 'http://localhost:5173', // replace with the origin of your client
  credentials: true, // this allows the session cookie to be sent with the request
};
dotenv.config();
io.use((socket,next)=>{
    if(socket.handshake.auth.token){
        socket.username=socket.handshake.auth.token;
        jwt.verify(socket.handshake.auth.token,process.env.JWT_SECRET,(err,decoded)=>{
            if(err){
               next(new Error('wrong token'));
            }else{
                socket.userid=decoded.userid;
                //console.log(socket.userid);
                next();
            }
        })    
    }
    else{
        next(new Error('please send token'));
    }
})
io.on('connection',async (socket)=>{
    console.log(socket.id);
    //console.log(socket.userid)
    const changeStream=await getLiveMessages(socket,socket.userid);
    socket.on('disconnect',()=>{
        console.log('goodbye');
        changeStream.close();
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
            }
        })  
        next()
    }
    else{
        return res.json({status:'no token given'});
    }
}
app.get('/messages',verifyUser,async (req,res)=>{
    const messages=await getMessages(req.userid);
    res.json(messages);
})
app.post('/sendmessage',verifyUser,async (req,res)=>{
    insertMessages({userid:req.userid,message:req.body.message,receiverid:req.body.receiverid});
    res.json({status:'suceessfully added message'});
})
app.post('/register',(req,res)=>{
        insertUserData(req.body).then((userId)=>{
        if(userId){
            //console.log(userId);
            res.cookie('token',jwt.sign({userid:userId},process.env.JWT_SECRET));
            res.json({status:'successfully registered'});
        }
        else{
        res.json({status:'failure register again'});
        }

    }) 
})
app.get('/userfriends',verifyUser,async (req,res)=>{
    //console.log('users')
    const users=await getUsers();
    res.json(users);
})
app.post('/changepassword',verifyUser,async (req,res)=>{
    const authenticateUserperson=await authenticateUser(req.body);
    if(authenticateUserperson.status=='success'){
        const changeuserPassword=await changePassword({userid:req.userid,password:req.body.newpassword});
        if(changeuserPassword){
            res.json({status:'change Password successfully'})
        }
        else{
            res.json({status:'failed to change password'});
        }
    }
    else{
        res.json({status:'wrong initial password'});
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
        res.json({message:'successfully added profile pic',imageUrl:uploadResponse.secure_url});
    }
    else{
        res.status(500).json({message:'error in adding profile pic'})
    }
    console.log(uploadResponse);
})
app.post('/login',async (req,res)=>{
    const authenticateUserperson=await authenticateUser(req.body)
    if(authenticateUserperson.status=='success'){
        const userId=authenticateUserperson.results[0]._id;
        //console.log(userId);
        //insertMessages({userid:userId,message:'ODM Baba'})
        res.cookie('token',jwt.sign({userid:userId},process.env.JWT_SECRET))
        res.json({status:'success',username:authenticateUserperson.results[0].username,imageUrl:authenticateUserperson.results[0].imageUrl});
    }
    else if(authenticateUserperson=='wrong password'){
        res.json({status:'wrong password'})
    }
    else if(authenticateUserperson=='invalid email'){
        res.json({status:'invalid email'});
    }
    else{
        res.send('failure');
    }
})
app.listen(4000);
/*io.on('connection',socket=>{
    console.log(socket.id);
    socket.on('custom-event',(postmanMessage,room)=>{
        console.log(postmanMessage);
        if(room==''){
            socket.broadcast.emit('bro-code','thank you')

        }
        else{
            socket.to(room).emit('bro-code','thank you');
        }
        
    })
    socket.on('join-room',(room)=>{
        socket.join(room);
    })
})*/



