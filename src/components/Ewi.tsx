import * as React from 'react';
import { useContext, useEffect, useState } from 'react';
import { Note, noteIndex, Song } from '../db/Song';
import { noteToFingerings } from '../lib/ewi';
import { useHotkeys } from '../lib/useHotkeys';
import { midiToNoteName } from '../lib/utils';
import { AppContext } from './App';
import { ProgressBar } from './ProgressBar';

require('../styles/ewi.less');

interface Props {
  song: Song;
  noteDown: number | null;
}

export function Ewi({ song, noteDown }: Props): JSX.Element {
  const { database } = useContext(AppContext);

  const [currentNote, setCurrentNote] = useState<Note>(song.notes[0]);
  const [wrongNote, setWrongNote] = useState<string | null>(null);

  function gotoBookmark(bookmark: number): void {
    setCurrentNote(song.notes[bookmark]);
  }

  function keyToBookmark(key: number): void {
    // numbers 1 through 9
    const index = key - 48;
    const bookmark = song.bookmarks[index - 1];
    bookmark && gotoBookmark(bookmark);
  }

  function skipNote(delta: number): void {
    const index = noteIndex(song, currentNote);
    const newIndex = Math.min(
      Math.max(0, index + delta),
      song.notes.length - 1);

    setCurrentNote(song.notes[newIndex]);
  }

  useHotkeys({
    49: keyToBookmark,
    50: keyToBookmark,
    51: keyToBookmark,
    52: keyToBookmark,
    53: keyToBookmark,
    54: keyToBookmark,
    55: keyToBookmark,
    56: keyToBookmark,
    57: keyToBookmark,
  }, {
    32: (_, e) => {
      skipNote(1);
      e.preventDefault();
    },
    39: _ => skipNote(1),
    37: _ => skipNote(-1),
  });

  const empty = (i: number) => <div key={i} className="note"></div>;
  const noteContainers = song.notes.map((n, i) =>
    <div key={i} className="note"><span>{midiToNoteName(n.midi)}</span></div>);

  const onClickFingering = async (fingeringId: string) => {
    // reset to null if clicking on currently preferred fingering
    const fingering =
      currentNote.preferredEwiFingering === fingeringId
        ? null : fingeringId;

    await database.savePreferredFingering(
      song,
      currentNote,
      fingering);

    setCurrentNote({
      ...currentNote,
      preferredEwiFingering: fingering
    });

    // to go around funky business with the setInterval up there. ugly
    currentNote.preferredEwiFingering = fingering;
  };

  useEffect(() => {
    scrollNotes(noteIndex(song, currentNote));
  });

  useEffect(() => {
    if (noteDown === currentNote.midi) {
      setCurrentNote(nextNote(song, currentNote));
      setWrongNote(null);
    } else {

      noteDown && setWrongNote(midiToNoteName(noteDown));
      console.log(wrongNote);
    }
  }, [noteDown]);

  return <div id="ewi">
    <div className="main-area">
      <ProgressBar
        song={song}
        currentNote={currentNote}
        gotoBookmark={gotoBookmark} />
      <div className="notes-and-fingerings">
        <div className="notes-container">
          <div className="notes">
            {[empty(-1), empty(-2)]
              .concat(noteContainers)
              .concat([empty(999998), empty(999999)])}
          </div>
          <div className="notes-mask notes-mask-left"></div>
          <div className="notes-mask notes-mask-right"></div>
        </div>
        {wrongNote &&
          <div key={wrongNote}
            className="wrong-note">{wrongNote}</div>}
        <div className="ewi-fingerings">
          {noteToFingerings(
            currentNote.midi,
            currentNote.preferredEwiFingering,
            onClickFingering)}
        </div>
      </div>
    </div>
  </div>;
}

function nextNote(
  song: Song,
  currentNote: Note): Note {
  const nextIndex = noteIndex(song, currentNote) + 1;

  if (nextIndex < song.notes.length) {
    return song.notes[nextIndex];
  } else {
    return currentNote;
  }
}

function scrollNotes(index: number): void {
  const noteWidth =
    getComputedStyle(document.querySelector('#ewi .note')!).width || '0';

  const container = document.querySelector<HTMLElement>('#ewi .notes')!;
  const newLeft = parseFloat(noteWidth) * index * -1;
  container.style.left = newLeft + 'px';
}
