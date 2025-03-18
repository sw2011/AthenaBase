import notice from "@component/notice";
import Query from "@component/query";
import { ChartConfig, ChartType } from "@component/query/chart";
import { BarChartConfig } from "@component/query/chart/bar";
import api from "@internal/api";
import logger from "@internal/helper/logger";
import { BarChartIcon, GearIcon, LightningBoltIcon, TableIcon } from "@radix-ui/react-icons";
import { Button } from "@shadcn/component/ui/button";
import { Input } from "@shadcn/component/ui/input";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@shadcn/component/ui/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shadcn/component/ui/select";
import { Separator } from "@shadcn/component/ui/separator";
import { Code2Icon, CodeIcon, DownloadCloudIcon, Loader2, PieChart, Play, Table } from "lucide-react";
import * as monaco from "monaco-editor";
import React from "react";

const Page: React.FC = () => {
	const [showEditor, setShowEditor] = React.useState<boolean>(true);
	const [dbs, setDbs] = React.useState<DataBase[]>([]);
	const [db, setDb] = React.useState<DataBase>();
	const [stmt, setStmt] = React.useState<string>("-- Enter your sql here --\n");
	const [selectedStmt, setSelectedStmt] = React.useState<string>("");
	const [loading, setLoading] = React.useState<boolean>(false);
	const [resp, setResp] = React.useState<RespData<QueryResult>>();

	const [chartConfig, setChartConfig] = React.useState<{
		open: boolean, type: ChartType, config: ChartConfig
	}>({ open: false, type: "table", config: {} });

	React.useEffect(() => {
		api.database.list().then(resp => setDbs(resp.data)).catch(reason => notice.toast.error(`${reason}`));
	}, []);

	const query = (stmt: string) => {
		if (!db?.id) {
			notice.toast.warning("please select query database.");
			return;
		}
		setLoading(true);
		logger.info("query: ", stmt);
		api.query(db.id, stmt).then(resp => {
			logger.info("query result:", resp);
			setResp(resp);
		}).catch(
			reason => notice.toast.error(`${reason}`)
		).finally(
			() => setLoading(false)
		);
	};

	const WorkSpace = <div className="flex-1 overflow-auto flex flex-col">
		<div className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
			<div className="flex space-x-2 items-center">
				<Select onValueChange={(value) => setDb(dbs.find(d => d.id.toString() === value))}>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Select Database" />
					</SelectTrigger>
					<SelectContent>
						{dbs.map((db) => <SelectItem key={db.id} value={db.id.toString()}>{db.name}</SelectItem>)}
					</SelectContent>
				</Select>
				{db?.id && <Button size="icon" disabled={loading} onClick={() => query(selectedStmt || stmt)}
				>{loading ? <Loader2 className="animate-spin" /> : <Play />}</Button>}
			</div>
			<div>
				<Button variant="ghost" size="icon" onClick={() => setShowEditor(se => !se)}>
					{showEditor ? <CodeIcon /> : <Code2Icon />}
				</Button>
			</div>
		</div>
		<Separator className="my-2" />
		{db?.id && <ResizablePanelGroup direction="vertical" className="flex-1 overflow-auto">
			<ResizablePanel minSize={25} className={`relative ${!showEditor ? "hidden" : ""}`}>
				<Query.Editor database={db}
					value={stmt} onValueChange={(value) => setStmt(value)}
					onSelectedValueChange={(value) => setSelectedStmt(value)}
					actions={{
						"query": {
							label: "QueryCommand",
							keybindings: [
								monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
							],
							run: () => query(selectedStmt || stmt),
						}
					}}
				/>
			</ResizablePanel>
			<ResizableHandle withHandle className={`${!showEditor ? "hidden" : ""} my-2`} />
			<ResizablePanel minSize={25} className="flex flex-col">
				<div className={
					"flex-1 overflow-auto rounded-lg " +
					"scrollbar-thin scrollbar-thumb-muted/90 scrollbar-track-background/10"
				}>
					{/* <Query.Chart
							className="w-full h-full" type="bar" data={resp.data}
							config={{
								config: {
									"id-0": {
										label: "id",
										color: "#2563eb",
									}
								},
								axis: { x: "date-2", y: ["id-0", "dau-3"] }
							}}
						/> */}
					{resp?.data ?
						<Query.Chart data={resp.data} {...chartConfig} />
						:
						<div className="w-full h-full flex justify-center items-center">
							Your results will be displayed here
						</div>
					}
				</div>
				{resp && <div className="pt-2 flex justify-between items-center">
					<div className="flex items-center space-x-1">
						<Button variant="secondary" onClick={() => setChartConfig(v => ({ ...v, open: !v.open }))}>Visualization</Button>
						<Button variant="ghost" size="icon"><GearIcon /></Button>
					</div>
					<div className="flex items-center space-x-1">
						<Button variant="ghost" size="icon"><TableIcon /></Button>
						<Separator orientation="vertical" className="h-6" />
						<Button variant="ghost" size="icon"><PieChart /></Button>
					</div>
					<div className="flex items-center space-x-2 text-sm">
						<div className="text-muted-foreground">Showing first {resp.data?.results?.length} rows</div>
						<div className="flex items-center space-x-1"><LightningBoltIcon className="w-4" />{resp.latency}ms</div>
						<Button variant="ghost" size="icon"><DownloadCloudIcon /></Button>
					</div>
				</div>}
			</ResizablePanel>
		</ResizablePanelGroup>}
		{!db?.id && <div className="flex-1 flex flex-col justify-center items-center">Please select query database.</div>}
	</div>;

	const VisualizationConfig = <div className={`${chartConfig.open ? "" : "hidden"} w-72 px-2`}>
		<div className="flex space-x-1">
			<Button
				variant={chartConfig.type === "table" ? "default" : "outline"}
				size="icon"
				onClick={() => {
					if (chartConfig.type === "table") return;
					setChartConfig(cc => ({ ...cc, type: "table", config: {} }));
				}}
			><Table /></Button>
			<Button
				variant={chartConfig.type === "bar" ? "default" : "outline"}
				size="icon"
				onClick={() => {
					if (chartConfig.type === "bar") return;
					setChartConfig(cc => ({ ...cc, type: "bar", config: { config: {}, axis: {} } }));
				}}
			><BarChartIcon /></Button>
		</div>
		{chartConfig.type === "bar" && <div>
			<div>
				config X axis:
				<Select
					value={(chartConfig.config as BarChartConfig).axis.x}
					onValueChange={(value) => {
						setChartConfig(cc => {
							const config = cc.config as BarChartConfig;
							config.axis.x = value;
							return { ...cc, config: config };
						});
					}}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Select a column for X axis." />
					</SelectTrigger>
					<SelectContent>
						{resp?.data.columns.map((col, index) => <SelectItem key={index} value={`${col.name}-${index}`}>
							{col.name}
						</SelectItem>)}
					</SelectContent>
				</Select>
			</div>
			<div>
				config Y axis:
				{((chartConfig.config as BarChartConfig).axis.y || [""]).map((item, index) => <div
					key={index} className="flex space-x-1"
				>
					<Select
						value={item}
						onValueChange={(value) => {
							setChartConfig(cc => {
								const axis = (cc.config as BarChartConfig).axis;
								const yaxis = axis.y || [""];
								yaxis[index] = value;
								return { ...cc, config: { ...cc.config, axis: { ...axis, y: yaxis } } };
							});
						}}
					>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="Select a column for Y axis." />
						</SelectTrigger>
						<SelectContent>
							{resp?.data.columns.map((col, colIndex) => <div key={`${index}-${colIndex}`}>
								<SelectItem value={`${col.name}-${colIndex}`}>
									{col.name}
								</SelectItem>
							</div>)}
						</SelectContent>
					</Select>
					<Input type="color" value={
						((chartConfig.config as BarChartConfig).config[item] || { "color": "" }).color
					} onChange={(e) => {
						const color = e.target.value;
						setChartConfig(cc => {
							const config = (cc.config as BarChartConfig).config;
							config[item] = { color };
							return { ...cc, config: { ...cc.config, config: config } };
						});
					}} />
				</div>)}
				<Button onClick={() => setChartConfig(cc => ({
					...cc,
					config: {
						...cc.config,
						axis: {
							...(cc.config as BarChartConfig).axis,
							y: [...(cc.config as BarChartConfig).axis.y, ""]
						}
					}
				}))}>Add Y Axis</Button>
			</div>
		</div>}
	</div>;

	return <div className="flex-1 flex">
		{VisualizationConfig}
		{WorkSpace}
	</div>;
};

export default Page;