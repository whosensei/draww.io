import { chats } from "@repo/db/schema";
import axios from "axios"
import { db } from "@repo/db";
import { types } from "util";
// import { WebSocket } from "ws";

export async function initDraw(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket, tool: string | null, color: string ,selectedbgColor :string) {

    const context = canvas.getContext("2d");

    if (!context) {
        return
    }

    const ctx = context;

    type shapes = {

        type: "rect",
        StartX: number,
        StartY: number
        width: number,
        height: number,
        color: string
    } |
    {
        type: "circle",
        StartX: number,
        StartY: number,
        radius: number,
        color: string
    } |
    {
        type: "line",
        StartX: number,
        StartY: number,
        width: number,
        height: number
        color: string
    } |
    {

        type: "pen",
        points: { x: number, y: number }[],
        color: string

    }

    const ExistingShapes: shapes[] = await getExistingShapes(roomId);

    socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "chat") {
            const shapedata = JSON.parse(msg.message);
            console.log(shapedata)
            ExistingShapes.push(shapedata.shape)
            clearCanvas(ExistingShapes, ctx, canvas)
        }
    }

    clearCanvas(ExistingShapes, ctx, canvas)

    let clicked = false;
    let StartX: number
    let StartY: number
    let currentPenPoints: { x: number, y: number }[] = [];
    let drawing: boolean = false

    canvas.addEventListener("mousedown", (e) => {

        clicked = true
        drawing = true
        StartX = e.clientX;
        StartY = e.clientY;
        currentPenPoints = [{ x: StartX, y: StartY }];
        ctx.beginPath();
        ctx.moveTo(StartX, StartY);
    })

    canvas.addEventListener("mouseup", (e) => {
        clicked = false
        const EndX = e.clientX
        const EndY = e.clientY
        drawing = false

        let shape: shapes | null = null

        if (tool === "rectangle") {
            shape = {
                type: "rect",
                StartX,
                StartY,
                width: e.clientX - StartX,
                height: e.clientY - StartY,
                color: color
            }
        } else if (tool === "circle") {
            shape = {
                type: "circle",
                StartX,
                StartY,
                radius: Math.sqrt((e.clientX - StartX) ** 2 + (e.clientY - StartY) ** 2),
                color: color
            }
        } else if (tool === "line") {
            shape = {
                type: "line",
                StartX,
                StartY,
                width: e.clientX - StartX,
                height: e.clientY - StartY,
                color: color
            }
        } else if (tool === "pen") {
            shape = {
                type: "pen",
                points: [...currentPenPoints],
                color: color
            };
        }

        if (!shape) {
            return
        }

        const data = JSON.stringify({
            type: "chat",
            message: JSON.stringify({ shape }),
            roomId
        })

        socket.send(data)
    })

    canvas.addEventListener("mousemove", (e) => {
        if (clicked) {
            const width: number = e.clientX - StartX;
            const height: number = e.clientY - StartY;
            const radius: number = Math.sqrt((e.clientX - StartX) ** 2 + (e.clientY - StartY) ** 2)
            clearCanvas(ExistingShapes, ctx, canvas)
            ctx.strokeStyle = color
            console.log(tool)
            switch (tool) {
                case "rectangle":
                    ctx.strokeRect(StartX, StartY, width, height)
                    break;
                case "circle":
                    ctx.beginPath();
                    ctx.arc(StartX, StartY, radius, 0, 2 * Math.PI);
                    ctx.stroke();
                    break;
                case "line":
                    ctx.beginPath();
                    ctx.moveTo(StartX, StartY)
                    ctx.lineTo(e.clientX, e.clientY)
                    ctx.stroke()
                    break;
                case "pen":
                    if (!drawing) return;
                    ctx.lineTo(e.clientX, e.clientY);
                    ctx.stroke();
                    currentPenPoints.push({ x: e.clientX, y: e.clientY });
                    break;
            }
        }
    })

    function clearCanvas(ExistingShapes: shapes[], ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = selectedbgColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ExistingShapes.map((shape) => {
            if (shape.type === "rect") {
                ctx.strokeStyle = shape.color
                ctx.strokeRect(shape.StartX, shape.StartY, shape.width, shape.height)
            } else if (shape.type === "circle") {
                ctx.beginPath();
                ctx.strokeStyle = shape.color
                ctx.arc(shape.StartX, shape.StartY, shape.radius, 0, 2 * Math.PI);
                ctx.stroke()
            } else if (shape.type === "line") {
                ctx.beginPath();
                ctx.strokeStyle = shape.color
                ctx.moveTo(shape.StartX, shape.StartY)
                ctx.lineTo(shape.StartX + shape.width, shape.StartY + shape.height)
                ctx.stroke()
            } else if (shape.type === "pen") {
                ctx.beginPath();
                ctx.strokeStyle = shape.color;
                const [first, ...rest] = shape.points;
                if (first) ctx.moveTo(first.x, first.y);
                rest.forEach(pt => ctx.lineTo(pt.x, pt.y));
                ctx.stroke();
            }
        })
    }

    async function getExistingShapes(roomId: string) {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_HTTP_BACKEND!}/chats/${roomId}`);
        const messages = res.data.messages;

        const shapes = messages.map((x: { message: string }) => {
            const parsedData = JSON.parse(x.message)
            return parsedData.shape
        })

        return shapes
    }

}

