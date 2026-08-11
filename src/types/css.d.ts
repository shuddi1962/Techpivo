declare module "*.css"
declare module "*.mjs?url" {
  const src: string
  export default src
}
declare module "*.worker.mjs?url" {
  const src: string
  export default src
}