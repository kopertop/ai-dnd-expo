import { Redirect } from 'expo-router';

const LegacyNewGameRoute = () => <Redirect href="/new-character" />;

LegacyNewGameRoute.displayName = 'LegacyNewGameRoute';

export default LegacyNewGameRoute;
