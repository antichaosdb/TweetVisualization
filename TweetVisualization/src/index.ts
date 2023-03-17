import {
    SciChartSurface,
    MouseWheelZoomModifier,
    ZoomExtentsModifier,
    ZoomPanModifier,
    XyTextDataSeries,
    XyzDataSeries,
    AUTO_COLOR,
    SciChartJsNavyTheme,
    ECoordinateMode,
    TextAnnotation,
    TextLabelProvider,
    LogarithmicAxis,
    NumericAxis,
    EllipsePointMarker,
    FastBubbleRenderableSeries,
    FastTextRenderableSeries,
    NumberRange,
    EHorizontalAnchorPoint,
    EVerticalAnchorPoint,
    ENumericFormat,
} from 'scichart';

// To deploy this, set your runtime key here 
//SciChartSurface.setRuntimeLicenseKey("");

const enum EEntityType {
    Organization = "Organization",
    Person = "Person",
    Quantity = "Quantity",
    URL = "URL",
    Location = "Location",
    Other = "Other"
}

export const drawExample = async () => {
    const { sciChartSurface, wasmContext } = await SciChartSurface.create('chart1', {
        theme: new SciChartJsNavyTheme(),
    });
    const xAxis = new NumericAxis(wasmContext, { axisTitle: 'Entity', autoTicks: false });
    sciChartSurface.xAxes.add(xAxis);
    sciChartSurface.yAxes.add(
        new NumericAxis(wasmContext, { axisTitle: 'Sentiment', labelPrecision: 0, growBy: new NumberRange(0, 0.1) })
    );

    sciChartSurface.chartModifiers.add(
        new ZoomPanModifier(),
        new ZoomExtentsModifier(),
        new MouseWheelZoomModifier()
        //new CursorModifier({ showTooltip: true })
    );
    sciChartSurface.zoomExtents();

    const setData = async (entityType: EEntityType) => {
        sciChartSurface.renderableSeries.asArray().forEach(rs => rs.delete());
        sciChartSurface.renderableSeries.clear();

        const data: Array<{ name: string; count: number }> = await fetch(`/api/TweetData/Entities/${entityType}?limit=15`).then(
            (d) => d.json()
        );
        const names = data.map((d) => d.name);
        xAxis.labelProvider = new TextLabelProvider({ labels: names, rotation: 45 });
        xAxis.axisRenderer.hideOverlappingLabels = false;
        xAxis.tickProvider.getMajorTicks = (minor, major, range) => Array.from(Array(names.length)).map((_, i) => i);
    
        const nameList = encodeURIComponent(names.join(','));
        const sentiment: Array<{ name: string; yValues: number[] }> = await fetch(
            '/api/TweetData/Sentiment/' + nameList
        ).then((d) => d.json());
        // Create series for each entry
        let x = 0;
        for (const entry of sentiment) {
            const bubbleSeries = new FastBubbleRenderableSeries(wasmContext, {
                pointMarker: new EllipsePointMarker(wasmContext, {
                    stroke: AUTO_COLOR,
                    fill: AUTO_COLOR,
                    height: 32,
                    width: 32,
                }),
            });
            //entry.yValues[50] = 0;
            bubbleSeries.dataSeries = new XyzDataSeries(wasmContext, {
                dataSeriesName: entry.name,
                isSorted: true,
                containsNaN: false,
                xValues: Array.from(Array(entry.yValues.length)).fill(x),
                yValues: Array.from(Array(entry.yValues.length)).map((_, i) => i),
                zValues: entry.yValues.map((y) => (y > 0 ? 3 * Math.log2(y) + 5 : 0)),
            });
            x++;
            sciChartSurface.renderableSeries.add(bubbleSeries);
        }
    }
    await setData(EEntityType.Organization);
    (document.querySelector("#entityType") as HTMLSelectElement).onchange = (ev: Event) => {
        // @ts-ignore
        setData(ev.target.value);
    }

    return sciChartSurface;
};

export const drawExample2 = async () => {
    const { sciChartSurface, wasmContext } = await SciChartSurface.create('chart2', {
        theme: new SciChartJsNavyTheme(),
    });
    const xAxis = new LogarithmicAxis(wasmContext, {
        axisTitle: 'Count',
        logBase: 2,
        labelFormat: ENumericFormat.SignificantFigures,
        growBy: new NumberRange(0, 0.1),
    });
    sciChartSurface.xAxes.add(xAxis);
    sciChartSurface.yAxes.add(
        new NumericAxis(wasmContext, {
            axisTitle: 'Average Sentiment',
            labelPrecision: 2,
            visibleRangeLimit: new NumberRange(-0.1, 1.1),
        })
    );

    const data: Array<{ name: string; count: number; sentiment: number }> = await fetch(
        '/api/TweetData/Entities/Organization?limit=200'
    ).then((d) => d.json());
    const yValues = data.map((d) => d.sentiment);
    const adjArr: Record<number, number> = {};
    for (let i = 0; i < yValues.length; i++) {
        const y = yValues[i];
        if (y === 0.5) {
            let adj = adjArr[data[i].count];
            if (!adj) {
                adjArr[data[i].count] = 0.0001;
                continue;
            }
            yValues[i] += adj;
            if (adj > 0) {
                adj = -adj;
            } else {
                adj = -adj + 0.0001;
            }
            adjArr[data[i].count] = adj;
        }
    }
    const xValues = data.map((d) => d.count);
    const textValues = data.map((d) => d.name.replace(/[^a-zA-Z0-9 @\(\)]/g, ''));
    const series = new FastTextRenderableSeries(wasmContext, {
        dataLabels: { style: { fontFamily: 'Arial', fontSize: 10 } },
        dataSeries: new XyTextDataSeries(wasmContext, {
            xValues,
            yValues,
            textValues,
            containsNaN: false,
        }),
    });
    sciChartSurface.renderableSeries.add(series);

    sciChartSurface.chartModifiers.add(
        new ZoomPanModifier(),
        new ZoomExtentsModifier(),
        new MouseWheelZoomModifier()
        //new YAxisDragModifier()
        //new CursorModifier({ showTooltip: true })
    );
    const downloadButton = new TextAnnotation({
        x1: 1,
        y1: 1,
        xCoordinateMode: ECoordinateMode.Relative,
        yCoordinateMode: ECoordinateMode.Relative,
        horizontalAnchorPoint: EHorizontalAnchorPoint.Right,
        verticalAnchorPoint: EVerticalAnchorPoint.Bottom,
        text: 'Dowload Data',
        fontSize: 18,
        textColor: 'orange',
        onClick: (args) => {
            const json = series.dataSeries.toJSON();
            const text = JSON.stringify(json);
            var element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
            element.setAttribute('download', 'chartData.json');
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        },
    });
    sciChartSurface.annotations.add(downloadButton);

    sciChartSurface.zoomExtents();
};

const downloadText = (filename: string, text: string) => {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
};

drawExample();
drawExample2();
