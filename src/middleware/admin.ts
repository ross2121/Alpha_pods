import { PrismaClient } from "@prisma/client"
export const admin_middleware=async(telegram_id:string)=>{
    const  prisma=new PrismaClient();
    const admin=await prisma.user.findUnique({
        where:{
            telegram_id:telegram_id
        }
    });
    if(!admin){
        return false;
    }
    if(admin.role=="user"){
        return false;
    
    }
   return true;
}