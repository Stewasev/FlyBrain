from __future__ import annotations


class InternTable:
    def __init__(self) -> None:
        self._index: dict[str, int] = {"": 0}
        self.strings: list[str] = [""]

    def intern(self, value: str | None) -> int:
        if value is None:
            value = ""
        existing = self._index.get(value)
        if existing is not None:
            return existing
        idx = len(self.strings)
        self._index[value] = idx
        self.strings.append(value)
        return idx
