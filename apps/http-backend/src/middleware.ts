import { NextFunction ,Request, Response } from "express";
import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
import path from "path";
import { JWT_SECRET } from "@repo/backend-common/config";
import { JwtPayload } from "jsonwebtoken";


dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export default function middleware(req :Request,res :Response,next :NextFunction) {
    const token = req.headers['authorization'] ?? ""
    const decodedData = jwt.verify(token, JWT_SECRET)

    if(!decodedData){
        res.status(400).json({
            message:"Unauthorised access"
        })
    }
    try{
        if(decodedData){
            // @ts-ignore
            req.userId = decodedData.id;
            next();
        }else{
            console.log("Unauthorised")
        }
    }catch(error){
        res.status(400).json({
            message : "Invalid token"
        })
    }
}