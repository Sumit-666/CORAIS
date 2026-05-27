const generateOTP = () => {
    return  Math.floor(135000 + Math.random()* 200000).toString();
};
module.exports = generateOTP;