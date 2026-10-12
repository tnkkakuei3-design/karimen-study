import { handleCloud } from '../../server/cloud-api.mjs';
export const onRequest = context => handleCloud(context.request, context.env, context);
