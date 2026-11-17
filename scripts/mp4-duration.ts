/** Reads the movie duration from the `mvhd` box of an MP4/MOV file, no ffprobe needed. */
export function mp4Duration(buf: Uint8Array): number | undefined {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const findBox = (start: number, end: number, type: string): [number, number] | undefined => {
    let off = start;
    while (off + 8 <= end) {
      let size = view.getUint32(off);
      const name = String.fromCharCode(buf[off + 4], buf[off + 5], buf[off + 6], buf[off + 7]);
      let header = 8;
      if (size === 1) {
        size = Number(view.getBigUint64(off + 8));
        header = 16;
      } else if (size === 0) {
        size = end - off;
      }
      if (size < header) return undefined;
      if (name === type) return [off + header, off + size];
      off += size;
    }
    return undefined;
  };
  const moov = findBox(0, buf.byteLength, "moov");
  if (!moov) return undefined;
  const mvhd = findBox(moov[0], moov[1], "mvhd");
  if (!mvhd) return undefined;
  const p = mvhd[0];
  const version = buf[p];
  if (version === 1) {
    const timescale = view.getUint32(p + 20);
    const duration = Number(view.getBigUint64(p + 24));
    return timescale ? duration / timescale : undefined;
  }
  const timescale = view.getUint32(p + 12);
  const duration = view.getUint32(p + 16);
  return timescale ? duration / timescale : undefined;
}
