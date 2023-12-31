import { ESLint } from 'eslint';
import { readFileSync } from 'fs';

type SysScriptInclude = {
    client_callable: string;
    access: string;
    sys_mod_count: string;
    active: string;
    description: string;
    sys_updated_on: string;
    sys_tags: string;
    script: string;
    sys_class_name: string;
    sys_id: string;
    sys_package: string;
    sys_update_name: string;
    sys_updated_by: string;
    api_name: string;
    sys_created_on: string;
    caller_access: string;
    name: string;
    sys_name: string;
    sys_scope: string;
    sys_created_by: string;
    sys_policy: string;
    __status: string;
};




const ESLINT_DEFAULT_CONFIG: ESLint.ConfigData = {
    parserOptions: {
        ecmaVersion: 2018
    },
    rules: {
        "no-implicit-globals": "error",
        // "no-undef": "error",
        // "no-useless-catch": "error",
    },
    // extends: "eslint:recommended",
};


function printErrors(name: string, results: ESLint.LintResult[], firstLineOnly = false) {
    let hadMessages = false;

    for (const res of results) {
        for (const msg of res.messages) {
            hadMessages = true;
            const offendingLines = res.source?.split('\n').slice(
                msg.line - 1,
                firstLineOnly
                    ? msg.line + 1
                    : msg.endLine ?? msg.line + 1
            );
            console.log(`${name} - [${msg.ruleId}] ${msg.message} (${msg.line}:${msg.column})`);

            if (!offendingLines) continue;

            const columnStart = msg.column;
            const columnEnd = firstLineOnly
                ? msg.endLine ? columnStart + 1 : msg.endColumn ?? columnStart + 1
                : msg.endColumn ?? columnStart + 1;

            for (let i = 0; i < offendingLines.length; i++) {
                const line = offendingLines[i];
                console.log(`\t${line}`);


                // const whitespace = line.substring(0, columnStart - 1).match(/^\s+/)?.[0] ?? '';

                let caretLine = '';
                if (i === offendingLines.length - 1 && i === 0) {
                    // caretLine = whitespace 
                    //     + ' '.repeat(columnStart - whitespace.length - 1) 
                    //     + '^'.repeat(columnEnd - columnStart);
                    caretLine = ' '.repeat(columnStart - 1) + '^'.repeat(columnEnd - columnStart);
                } else if (i === 0) {
                    caretLine = ' '.repeat(columnStart - 1) + '^'.repeat(line.length - columnStart);
                } else if (i === offendingLines.length - 1) {
                    caretLine = '^'.repeat(columnEnd);
                } else {
                    caretLine = '^'.repeat(line.length);
                }

                console.log(`\t${caretLine}`);
            }
        }
    }

    if (hadMessages) console.log();
}



(async () => {
    const businessRules = (JSON.parse(readFileSync('./snow_src_files/sys_script.json', 'utf-8')) as { records: SysScriptInclude[] })
    const scriptIncludes = JSON.parse(readFileSync('./snow_src_files/sys_script_include.json', 'utf-8')) as { records: SysScriptInclude[] };

    const scriptIncludeResults = new RegExp(
        (await Promise.all(scriptIncludes.records
            .filter(e => e.script)
            .map(async (r) => {
                const eslint = new ESLint({
                    useEslintrc: false,
                    overrideConfig: {
                        ...ESLINT_DEFAULT_CONFIG,
                        globals: {
                            'current': 'readonly',
                            'previous': 'readonly',
                            'sn_ws': 'readonly',
                            'GlideRecord': 'readonly',
                            'gs': 'readonly',
                            'Class': 'readonly',
                            'GlideAggregate': 'readonly',
                            'GlideFilter': 'readonly',
                            'GlideElement': 'readonly',
                            'GlideDateTime': 'readonly',
                            'global': 'readonly',
                            [r.name]: 'writable',
                            ...scriptIncludes.records.reduce((acc, { name }) => {
                                if (name !== r.name) acc[name] = 'readonly';
                                return acc;
                            }, {} as Record<string, 'readonly'>)
                        }
                    }
                });

                const lint = await eslint.lintText((r.script as any).replaceAll('\t', '    '));
                // printErrors(r.name, lint);
                return { name: r.name, lint, updatedBy: r.sys_updated_by };
            })))
            .filter(e => e.lint[0].messages.length > 0)
            .map(e => e.name)
            .join('|')
    );


    const results = await Promise.all(businessRules.records
        .filter(e => e.script)
        // .filter(e => !["admin", "glide.maint", "maint"].includes(e.sys_created_by))
        .filter(e =>
            e.sys_created_by.trim().toLowerCase().endsWith('@thrivenetworks.com')
            || e.sys_updated_by.trim().toLowerCase().endsWith('@thrivenetworks.com')
        )
        // .filter(e => (e as any).collection === 'cmn_location')
        .map(async (r) => {
            const eslint = new ESLint({
                useEslintrc: false,
                overrideConfig: {
                    ...ESLINT_DEFAULT_CONFIG,
                    globals: {
                        'current': 'readonly',
                        'previous': 'readonly',
                        'sn_ws': 'readonly',
                        'GlideRecord': 'readonly',
                        'gs': 'readonly',
                        'Class': 'readonly',
                        'GlideAggregate': 'readonly',
                        'GlideFilter': 'readonly',
                        'GlideElement': 'readonly',
                        'GlideDateTime': 'readonly',
                        'global': 'readonly',
                        // [r.name]: 'writable',
                        ...scriptIncludes.records.reduce((acc, { name }) => {
                            if (name !== r.name) acc[name] = 'readonly';
                            return acc;
                        }, {} as Record<string, 'readonly'>)
                    }
                }
            });

            const lint = await eslint.lintText((r.script as any).replaceAll('\t', '    '));
            // printErrors(r.name, lint, true);
            return { name: r.name, lint, updatedBy: r.sys_updated_by };
        }));

    // const agg = results.reduce((acc, { name, lint: [res] }) => {
    //     if (res.messages.length > 0) acc[name] = res.messages.length;
    //     return acc;
    // }, {} as Record<string, number>);

    // // console.log(agg);
    // console.log(
    //     Object.entries(agg)
    //         .sort((a, b) => b[1] - a[1])
    //         .map(([name, count]) => `${name} (${results.find(e => e.name === name)?.updatedBy}) - ${count}`)
    //         .join('\n')
    // );
    // console.log();
    // const totalAtLeastOneErr = Object.values(agg).length;
    // console.log(`${totalAtLeastOneErr} / ${results.length} (${(totalAtLeastOneErr / results.length * 100).toFixed(2)}%)`);
    // console.log();

    // console.log(results.reduce((acc, { name, lint: [res] }) => {
    //     res.messages.forEach(e => {
    //         if (!acc[String(e.ruleId)]) acc[String(e.ruleId)] = 1;
    //         else acc[String(e.ruleId)]++;
    //     });
    //     return acc;
    // }, {} as any));

    const potentialWorst = results
        .filter(e => e.lint[0].messages.length > 0)
        .filter(e => e.lint[0].source && scriptIncludeResults.test(e.lint[0].source))

    potentialWorst.forEach(e => {
        console.log(`${e.name} (${e.updatedBy}) - ${scriptIncludeResults.exec(e.lint[0].source as string)}`);
        printErrors(e.name, e.lint);
    });


})().catch(console.error);