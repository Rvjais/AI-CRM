import mongoose from 'mongoose';
import formSchema from '../schemas/Form.schema.js';

const Form = mongoose.model('Form', formSchema);

export default Form;
