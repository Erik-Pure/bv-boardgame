import { memo } from "react";
import type { PlayerAvatar } from "@bv/game-core";
import { PlayerAvatarStack } from "../PlayerAvatarStack";

export type TableBoardPlayerTokenProps = {
  playerId: string;
  avatar: PlayerAvatar;
  color: string;
  curTx: number;
  curTy: number;
  tw: number;
  th: number;
  isActiveBoardPlayer: boolean;
  boardAnimationsEnabled: boolean;
  showBoardMoveArrows: boolean;
  moveArrowLeft: string | null;
  moveArrowRight: string | null;
  moveArrowLeftPos: { x: number; y: number };
  moveArrowRightPos: { x: number; y: number };
  moveArrowS: number;
};

function TableBoardPlayerTokenInner(props: TableBoardPlayerTokenProps) {
  const {
    playerId,
    avatar,
    color,
    curTx,
    curTy,
    tw,
    th,
    isActiveBoardPlayer,
    boardAnimationsEnabled,
    showBoardMoveArrows,
    moveArrowLeft,
    moveArrowRight,
    moveArrowLeftPos,
    moveArrowRightPos,
    moveArrowS,
  } = props;

  return (
    <g key={playerId} filter="url(#playerTokenShadow)">
      <foreignObject x={curTx} y={curTy} width={tw} height={th} overflow="visible">
        <div
          {...({ xmlns: "http://www.w3.org/1999/xhtml" } as Record<string, string>)}
          style={{
            width: tw,
            height: th,
            pointerEvents: "none",
            transform: isActiveBoardPlayer ? "scale(1.5)" : undefined,
            transformOrigin: "50% 50%",
          }}
        >
          <PlayerAvatarStack
            avatar={avatar}
            color={color}
            size="board"
            animate={boardAnimationsEnabled && isActiveBoardPlayer}
          />
        </div>
      </foreignObject>
      {showBoardMoveArrows && moveArrowLeft && moveArrowRight ? (
        <g transform={`translate(${curTx}, ${curTy})`} pointerEvents="none">
          <image
            className="bv-move-choice-board-arrow"
            href={`/icons/arrow-${moveArrowLeft}.svg`}
            x={moveArrowLeftPos.x}
            y={moveArrowLeftPos.y}
            width={moveArrowS}
            height={moveArrowS}
            aria-hidden={true}
          />
          <image
            className="bv-move-choice-board-arrow"
            href={`/icons/arrow-${moveArrowRight}.svg`}
            x={moveArrowRightPos.x}
            y={moveArrowRightPos.y}
            width={moveArrowS}
            height={moveArrowS}
            aria-hidden={true}
          />
        </g>
      ) : null}
    </g>
  );
}

function tokenPropsEqual(prev: TableBoardPlayerTokenProps, next: TableBoardPlayerTokenProps): boolean {
  return (
    prev.playerId === next.playerId &&
    prev.color === next.color &&
    prev.curTx === next.curTx &&
    prev.curTy === next.curTy &&
    prev.tw === next.tw &&
    prev.th === next.th &&
    prev.isActiveBoardPlayer === next.isActiveBoardPlayer &&
    prev.boardAnimationsEnabled === next.boardAnimationsEnabled &&
    prev.showBoardMoveArrows === next.showBoardMoveArrows &&
    prev.moveArrowLeft === next.moveArrowLeft &&
    prev.moveArrowRight === next.moveArrowRight &&
    prev.moveArrowS === next.moveArrowS &&
    prev.moveArrowLeftPos.x === next.moveArrowLeftPos.x &&
    prev.moveArrowLeftPos.y === next.moveArrowLeftPos.y &&
    prev.moveArrowRightPos.x === next.moveArrowRightPos.x &&
    prev.moveArrowRightPos.y === next.moveArrowRightPos.y &&
    prev.avatar.head === next.avatar.head &&
    prev.avatar.eyes === next.avatar.eyes &&
    prev.avatar.mouth === next.avatar.mouth
  );
}

export const TableBoardPlayerToken = memo(TableBoardPlayerTokenInner, tokenPropsEqual);
