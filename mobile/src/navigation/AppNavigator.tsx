import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Customer screens
import CustomerHomeScreen from '../screens/customer/HomeScreen';
import CreateOrderScreen from '../screens/customer/CreateOrderScreen';
import TrackOrderScreen from '../screens/customer/TrackOrderScreen';
import OrderHistoryScreen from '../screens/customer/OrderHistoryScreen';

// Shipper screens
import ShipperHomeScreen from '../screens/shipper/ShipperHomeScreen';
import ActiveDeliveryScreen from '../screens/shipper/ActiveDeliveryScreen';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function CustomerStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CustomerHome"
        component={CustomerHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateOrder"
        component={CreateOrderScreen}
        options={{ title: 'Đặt đơn hàng', headerTintColor: '#FF6B00' }}
      />
      <Stack.Screen
        name="TrackOrder"
        component={TrackOrderScreen}
        options={{ title: 'Theo dõi đơn hàng', headerTintColor: '#FF6B00' }}
      />
      <Stack.Screen
        name="OrderHistory"
        component={OrderHistoryScreen}
        options={{ title: 'Lịch sử đơn hàng', headerTintColor: '#FF6B00' }}
      />
    </Stack.Navigator>
  );
}

function ShipperStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ShipperHome"
        component={ShipperHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ActiveDelivery"
        component={ActiveDeliveryScreen}
        options={{ title: 'Đang giao hàng', headerTintColor: '#FF6B00' }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { token, user, isLoading, loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!token ? (
        <AuthStack />
      ) : user?.role === 'shipper' ? (
        <ShipperStack />
      ) : (
        <CustomerStack />
      )}
    </NavigationContainer>
  );
}
