export { to_i32_array, to_f32_array, to_f64_array }

function to_buf(str: string) {
  const bytes = window.atob(str)
  const buf = new ArrayBuffer(bytes.length)
  const dv = new DataView(buf)
  for (let i = 0; i < bytes.length; i++) {
    dv.setUint8(i, bytes.charCodeAt(i))
  }
  return buf
}

function to_i32_array(str: string) {
  return new Int32Array(to_buf(str))
}

function to_f32_array(str: string) {
  return new Float32Array(to_buf(str))
}

function to_f64_array(str: string) {
  return new Float64Array(to_buf(str))
}
