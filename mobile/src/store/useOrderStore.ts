import { create } from 'zustand';

export type OrderStatus =
  | 'searching' | 'accepted' | 'picking_up' | 'delivering' | 'delivered' | 'cancelled';

export interface Order {
  _id: string;
  pickupAddress: string;
  pickupLocation: { lat: number; lng: number };
  deliveryAddress: string;
  deliveryLocation: { lat: number; lng: number };
  packageDescription: string;
  fee: number;
  status: OrderStatus;
  shipper?: {
    id: string; name: string; vehicleType: string; rating: number;
    lat: number; lng: number;
  };
  shipperLocation?: { lat: number; lng: number };
  createdAt: string;
}

interface OrderState {
  activeOrder: Order | null;
  orders: Order[];
  setActiveOrder: (order: Order | null) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateShipperLocation: (orderId: string, lat: number, lng: number) => void;
  setOrders: (orders: Order[]) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  activeOrder: null,
  orders: [],

  setActiveOrder: (order) => set({ activeOrder: order }),

  updateOrderStatus: (orderId, status) =>
    set((state) => ({
      activeOrder:
        state.activeOrder?._id === orderId
          ? { ...state.activeOrder, status }
          : state.activeOrder,
    })),

  updateShipperLocation: (orderId, lat, lng) =>
    set((state) => ({
      activeOrder:
        state.activeOrder?._id === orderId
          ? { ...state.activeOrder, shipperLocation: { lat, lng } }
          : state.activeOrder,
    })),

  setOrders: (orders) => set({ orders }),
}));
