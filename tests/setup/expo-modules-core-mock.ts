export class UnavailabilityError extends Error {}
export class NativeModule<T = any> {
	constructor() {
		return this as any;
	}
}
export const Platform = { OS: 'web' };
export const requireOptionalNativeModule = (_name: string) => undefined;
export default {
	UnavailabilityError,
	NativeModule,
	Platform,
	requireOptionalNativeModule,
};
