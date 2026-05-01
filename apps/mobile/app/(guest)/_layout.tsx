import { Stack } from 'expo-router'
import { StripeProvider } from '@stripe/stripe-react-native'
import Constants from 'expo-constants'

const STRIPE_PK =
  (Constants.expoConfig?.extra?.stripePublishableKey as string | undefined) ?? ''

export default function GuestLayout() {
  return (
    <StripeProvider publishableKey={STRIPE_PK} merchantIdentifier="merchant.com.aosanctuary.app">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a0a' },
          animation: 'slide_from_right',
        }}
      />
    </StripeProvider>
  )
}
