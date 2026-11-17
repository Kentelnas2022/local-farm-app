import { useCallback, useEffect, useState } from "react";
import { Platform, ScrollView, ScrollViewProps } from "react-native";

/** Native touch scrolling with mouse dragging on the web. */
export default function DraggableToolRow(props: ScrollViewProps) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const bind = useCallback((view: ScrollView | null) => {
    if (Platform.OS === "web") setElement(view?.getScrollableNode() as HTMLElement | null);
  }, []);

  useEffect(() => {
    if (!element) return;
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startScroll = 0;
    const oldCursor = element.style.cursor;
    const oldSelect = element.style.userSelect;
    element.style.setProperty("cursor", "grab");
    const down = (event: MouseEvent) => {
      if (event.button !== 0) return;
      dragging = true;
      moved = false;
      startX = event.clientX;
      startScroll = element.scrollLeft;
    };
    const move = (event: MouseEvent) => {
      if (!dragging) return;
      const distance = event.clientX - startX;
      if (Math.abs(distance) > 5) moved = true;
      if (!moved) return;
      event.preventDefault();
      element.style.setProperty("cursor", "grabbing");
      element.style.setProperty("user-select", "none");
      element.scrollTo({ left: startScroll - distance });
    };
    const up = () => {
      dragging = false;
      element.style.setProperty("cursor", "grab");
      element.style.setProperty("user-select", oldSelect);
    };
    const click = (event: MouseEvent) => {
      if (!moved) return;
      event.preventDefault();
      event.stopPropagation();
      moved = false;
    };
    element.addEventListener("mousedown", down);
    element.addEventListener("click", click, true);
    window.addEventListener("mousemove", move, { passive: false });
    window.addEventListener("mouseup", up);
    window.addEventListener("blur", up);
    return () => {
      element.removeEventListener("mousedown", down);
      element.removeEventListener("click", click, true);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("blur", up);
      element.style.setProperty("cursor", oldCursor);
      element.style.setProperty("user-select", oldSelect);
    };
  }, [element]);

  return <ScrollView {...props} ref={bind} horizontal />;
}