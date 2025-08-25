import React from 'react'
import { useContext } from 'react';
import { ShopContext } from '../context/ShopContext';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const Verify = () => {

    const {navigate,token,setCartItems,backendUrl,clearCart} = useContext(ShopContext);
    const [searchParams,setSearchParams] = useSearchParams();

    const success=searchParams.get("success");
     const orderId=searchParams.get("orderId");

     const verifyPayment = async () => {
    try {
        if (!token) {
            return null;
        }

        const response = await axios.post(
           backendUrl + '/api/order/verifystripe',
            { success, orderId },
            { headers: { token } }
        );

        if (response.data.success) {
            toast.success("Payment successful and order placed");
            setCartItems({});
            navigate('/orders');
        } else {
            toast.error("Payment failed or cancelled");
            navigate('/cart');
        }
    } catch (error) {
        console.log(error);
        toast.error("Something went wrong while verifying payment");
    }
};

     useEffect(()=>{
        verifyPayment();
     },[token])
  return (
    <div>Verify</div>
  )
}

export default Verify;