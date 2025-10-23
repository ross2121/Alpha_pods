import axios from "axios";
const ORDER_URL="https://lite-api.jup.ag/ultra/v1";

export const getquote = async (inputMint: string, outputMint: string, amount: number) => {
  const url = `${ORDER_URL}/order?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}`;  
  try {
    const response = await axios.get(url);
    console.log("Order Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching order:", error);
    throw error;
  }
};
export const swap=async(requestId:String,signature:String)=>{
    const url=`${ORDER_URL}/execute`
    try{
        const response=await axios.post(url,{
            signedTransaction:signature,
            requestId:requestId
        });
        console.log(response.data);
    }catch(error){
        console.log("Error executing order",error);
        throw error;
    }
}

