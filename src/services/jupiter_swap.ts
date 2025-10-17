import axios from "axios";
const URL="https://lite-api.jup.ag/ultra/v1";
export const getquote = async (basemint: string, quotemint: string, amount: number) => {
  //curl --request GET \
  //   --url 'https://lite-api.jup.ag/ultra/v1/order?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1'
  const url = `${URL}/order?inputMint=${basemint}&outputMint=${quotemint}&amount=${amount}`;  
  try {
    const response = await axios.get(url);
    console.log("Response:", response.data);
    return response.data.requestId;
  } catch (error) {
    console.error("Error fetching quote:", error);
    throw error;
  }
};
export const swap=async(requestId:String,signature:String)=>{
    const url=`${URL}/execute`
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

