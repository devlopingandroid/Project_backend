 /*
 const asyncHandler = (fn) => async (req, res, next) => {
    try{
        await fn(req,res,next)
    }catch(error){
        req.status(500).json({message: error.message});
    }
 }
 */
const asyncHandler = (requestHandler) => {
    (req,res,next)=>{
        Promise.resolve(requestHandler(req, res,next)).
        catch((err)=>next(err))
    }
}

export {asyncHandler}