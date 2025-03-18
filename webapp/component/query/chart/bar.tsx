import logger from "@internal/helper/logger";
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@shadcn/component/ui/chart";
import React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

export interface BarChartConfig {
	config: ChartConfig
	axis: {
		x: string
		y: string[]
	}
}

type BarChartProps = BarChartConfig & QueryChartProps

const Chart: React.FC<BarChartProps> = (props) => {
	const data = React.useMemo(() => {
		return props.data.results?.map(row => {
			return row.reduce((acc, value, index) => {
				const columnName = props.data.columns[index].name;
				acc[`${columnName}-${index}`] = value;
				return acc;
			}, {} as Record<string, string | number>);
		})||[];
	}, [props.data]);

	React.useEffect(() => {
		logger.debug(data); logger.debug(props);
	}, [data, props]);

	return <ChartContainer config={props.config} className={props.className}>
		<BarChart accessibilityLayer data={data}>
			<CartesianGrid vertical={false} />
			<XAxis dataKey={props.axis.x} tickMargin={10} tickLine={false} axisLine={false} />
			<YAxis />
			<ChartTooltip content={<ChartTooltipContent />} />
			<ChartLegend content={<ChartLegendContent />} />
			{(props.axis.y || []).map((name, index) => <Bar key={index} dataKey={name} fill={`var(--color-${name})`} radius={4} />)}
		</BarChart>
	</ChartContainer>;
};

export default Chart;