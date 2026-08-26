export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL!;
export const SOCKET_PATH = "/socket.io";

export const operationsRoom = () => "operations";
export const truckRoom = (truckId: string) => `truck:${truckId}`;
export const shipmentRoom = (shipmentId: string) => `shipment:${shipmentId}`;
