import mongoose from 'mongoose';
import formSubmissionSchema from '../schemas/FormSubmission.schema.js';

const FormSubmission = mongoose.model('FormSubmission', formSubmissionSchema);

export default FormSubmission;
