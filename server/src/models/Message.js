import mongoose from 'mongoose';
import messageSchema from '../schemas/Message.schema.js';

const Message = mongoose.model('Message', messageSchema);

export default Message;

