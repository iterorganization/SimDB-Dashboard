const to_buf = function (str) {
  const bytes = window.atob(str);
  const buf = new ArrayBuffer(bytes.length);
  const dv = new DataView(buf);
  for (let i = 0; i < bytes.length; i++) {
    dv.setUint8(i, bytes.charCodeAt(i));
  }
  return buf;
}

const to_i32_array = function (str) {
  return new Int32Array(to_buf(str));
}

const to_f32_array = function (str) {
  return new Float32Array(to_buf(str));
}

const to_f64_array = function (str) {
  return new Float64Array(to_buf(str));
}

const process_array_key = function (word) {
  return word.replace(/(.*)#(\d+)/, '$1[$2]')
}

const capitalize = function (word) {
  return word[0].toUpperCase() + word.slice(1);
}

String.prototype.toLabel = function (name) {
  return this.split(/[\._]/).map(process_array_key).map(capitalize).join(' ');
}