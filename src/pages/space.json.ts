import { getSpace } from '../lib/space';

export const GET = async () => Response.json(await getSpace());
