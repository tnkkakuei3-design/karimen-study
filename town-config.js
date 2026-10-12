/* Optional provider settings. Keep this independent of study/progress storage.
 * googleMapsApiKey is a browser key restricted to the deployed HTTPS origins and
 * Maps JavaScript API / Places API (New). Do not put a server credential here.
 * Add ONLY verified Google Place IDs; never match a store by name alone.
 * suppliedPhotos: { shopId: [{url:'./assets/town/...', alt:'...', credit:'...', sourceUrl:'https://...', permission:'owner-provided'}] }
 * Add photos only when the owner has supplied them or reuse permission is recorded.
 */
window.KarimenTownConfig = Object.freeze({
  googleMapsApiKey: '',
  placeIds: {},
  suppliedPhotos: {}
});
