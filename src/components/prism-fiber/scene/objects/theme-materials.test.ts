import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from "three";
import { expect, it, vi } from "vitest";
import { buildBoardObject } from "./BoardObject";
import { buildOfficeObject } from "./OfficeObject";
import { resolvePrismAppearance } from "../prism-appearance";

it("recolors repeated notes without changing cached assets or board materials", () => {
  const board = new Group(), notes = new Group();
  const face = new Mesh(new BoxGeometry(3, 2, 0.1), new MeshStandardMaterial({ color: "#ffffff" }));
  face.name = "boardFace"; board.add(face);
  for (const name of ["boardEdge", "boardBack"]) {
    const part = new Mesh(face.geometry, face.material);
    part.name = name;
    board.add(part);
  }
  for (const name of ["pPlane4_lambert28_0", "pPlane3_lambert29_0", "pPlane5_lambert30_0"]) {
    const note = new Mesh(new BoxGeometry(0.2, 0.2, 0.01), new MeshStandardMaterial({ color: "#0000ff" }));
    note.name = name; notes.add(note);
  }
  const built = buildBoardObject(board, notes);
  built.applyNotePalette(["#ff0000", "#00ff00", "#0000ff"]);
  const colors: string[] = [];
  built.group.traverse(object => { if (object instanceof Mesh && object.material instanceof MeshStandardMaterial) colors.push(object.material.color.getHexString()); });
  expect(colors).toHaveLength(15);
  expect(new Set(colors)).toEqual(new Set(["ffffff", "ff0000", "00ff00", "0000ff"]));
  expect(face.material.color.getHexString()).toBe("ffffff");
  for (const mode of ["light", "dark", "light"] as const) {
    const appearance = resolvePrismAppearance(mode).board;
    built.applyAppearance(appearance);
    for (const [name, color] of [
      ["boardFace", appearance.faceColor],
      ["boardEdge", appearance.frameColor],
      ["boardBack", appearance.backColor],
    ] as const) {
      const part = built.group.getObjectByName(name) as Mesh<BoxGeometry, MeshStandardMaterial>;
      expect(part.material.color.getHex()).toBe(color);
    }
    expect(face.material.color.getHexString()).toBe("ffffff");
  }
  notes.children.forEach(object => { expect((object as Mesh<BoxGeometry, MeshStandardMaterial>).material.color.getHexString()).toBe("0000ff"); });
  built.dispose();
});

it("replaces the monitor while preserving current fade and source texture", () => {
  const office = new Group();
  const screen = new Mesh(new BoxGeometry(0.01, 2, 1), new MeshStandardMaterial());
  screen.name = "screen_desktop"; office.add(screen);
  const frameMaterial = new MeshStandardMaterial({ color: "#5c5c5c" });
  for (const name of ["screen_screen_0", "keyboard_keyboard_0", "mouse_mouse_0"]) {
    const part = new Mesh(screen.geometry, name.startsWith("screen_")
      ? frameMaterial : new MeshStandardMaterial({ color: "#ffffff", roughness: 0.8 }));
    part.name = name;
    office.add(part);
  }
  const source = new Texture(), replacement = new Texture();
  const desktop = new Mesh(new BoxGeometry(3, 0.1, 3), frameMaterial);
  desktop.name = "table_table_top_0";
  office.add(desktop);
  const keyboard = new Group();
  keyboard.add(new Mesh(new BoxGeometry(2, 0.2, 1), frameMaterial));
  const built = buildOfficeObject(office, source, keyboard);
  expect(built.group.getObjectByName("keyboard_keyboard_0")).toBeUndefined();
  expect(office.getObjectByName("keyboard_keyboard_0")).toBeTruthy();
  expect(built.group.getObjectByName("replacement-keyboard")).toBeTruthy();
  for (const name of ["mouse_mouse_0"]) {
    const accessory = built.group.getObjectByName(name) as Mesh<BoxGeometry, MeshStandardMaterial>;
    expect(accessory.material.color.getHexString()).toBe(frameMaterial.color.getHexString());
    expect(accessory.material.roughness).toBe(0.8);
    const original = office.getObjectByName(name) as Mesh<BoxGeometry, MeshStandardMaterial>;
    expect(original.material.color.getHexString()).toBe("ffffff");
  }
  built.monitorOpacity.snap(0.4);
  built.applyMonitorTexture(replacement);
  let opacity = 0;
  built.group.traverse(object => { if (object instanceof Mesh && "map" in object.material && object.material.map === replacement) opacity = object.material.opacity; });
  expect(opacity).toBe(0.4);
  expect(replacement.repeat.x).toBe(-1); expect(replacement.offset.x).toBe(1);
  expect(source.repeat.x).toBe(1);
  built.dispose(); replacement.dispose();
});


it("releases cloned materials when an asset cannot finish construction", () => {
  const source = new Group();
  const material = new MeshStandardMaterial();
  source.add(new Mesh(new BoxGeometry(1, 1, 1), material));
  const dispose = vi.spyOn(MeshStandardMaterial.prototype, "dispose");
  try {
    expect(() => buildBoardObject(source, new Group())).toThrow("Required prism mesh");
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(dispose.mock.contexts[0]).not.toBe(material);
  } finally { dispose.mockRestore(); }
});
