import React, { useCallback, useEffect, useRef, useState } from "react";
import "./Body.scss";
import { PRICING_OPTIONS } from "../../constant";
import { useSearchParams } from "react-router-dom";

type Product = {
    imagePath: string;
    id: string;
    title: string;
    creator: string;
    pricingOption: number;
    price: number;
};

const Body = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [data, setData] = useState<Product[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [activeFilter, setActiveFilter] = useState<number[]>([]);
    const [searchInp, setSearchInp] = useState<string>("");
    const [visibleCount, setVisibleCount] = useState(10);
    const inputRef = useRef(null);
    const productRef = useRef<HTMLDivElement | null>(null);
    const [sorting, setSorting] = useState<string>("relevance");
    const [range, setRange] = useState<number>(0);

    const fetchProducts = async () => {
        try {
            const url =
                "https://closet-recruiting-api.azurewebsites.net/api/data";
            const response = await fetch(url);
            if (!response.ok) {
                console.error("Something went wrong");
            }
            const data = await response.json();

            if (data) {
                setData(data);
                setProducts(data);
            }
        } catch (error) {
            console.log(error || "something went wrong");
        }
    };

    const handleFilter = (e: any) => {
        const filterKey = +e.target.value;

        let updatedFilter: number[] = [];
        if (activeFilter.includes(filterKey)) {
            updatedFilter = activeFilter.filter(
                (item: number) => item != filterKey
            );
        } else {
            updatedFilter = [...activeFilter, filterKey];
        }

        setActiveFilter(updatedFilter);
    };

    const handleReset = () => {
        setProducts(data);
        setActiveFilter([]);
        setVisibleCount(10);
    };

    const myDebounce = <T extends (...args: any[]) => void>(
        cb: T,
        delay: number
    ) => {
        let timerId: ReturnType<typeof setTimeout>;
        return function (...args: Parameters<T>) {
            clearTimeout(timerId);
            timerId = setTimeout(() => {
                cb(...args);
            }, delay);
        };
    };

    const handleSearch = (inp: string) => {
        console.log("inp", inp);
        setSearchInp(inp);
    };

    const handleSort = (res: Product[], isAscending: boolean) => {
        return res.sort((a, b) => {
            const isAPaid = a.pricingOption === 0;
            const isBPaid = b.pricingOption === 0;

            // prioritize paid items
            if (isAPaid && !isBPaid) return -1;
            if (!isAPaid && isBPaid) return 1;

            // if both paid ... sorting asc/desc
            if (isAPaid && isBPaid && !isAscending) return b.price - a.price;
            if (isAPaid && isBPaid && isAscending) return a.price - b.price;

            // if both free/view-only ... keeping same
            return a.pricingOption - b.pricingOption;
        });
    };

    const getFilteredProducts = (inp: string, filters: number[]) => {
        let res = data.filter((product) => {
            const matchesFilter =
                filters.length === 0 || filters.includes(product.pricingOption);
            const matchesSearch =
                product.title.toLowerCase().includes(inp.toLowerCase()) ||
                product.creator.toLowerCase().includes(inp.toLowerCase());
            return matchesFilter && matchesSearch;
        });

        if(range){
            res = res.filter((item) => item.price <= range);
        }

        if (sorting.toLowerCase() === "high to low") {
            handleSort(res, false);
        } else if (sorting.toLowerCase() === "low to high") {
            handleSort(res, true);
        }

        return res.slice(0, visibleCount);
    };

    // applied debouncing in input search
    const debouncedSearch = useCallback(myDebounce(handleSearch, 300), []);

    useEffect(() => {
        setProducts(getFilteredProducts(searchInp, activeFilter));
    }, [searchInp, activeFilter, data, visibleCount, sorting, range]);

    useEffect(() => {
        const params = new URLSearchParams();
        activeFilter.forEach((filter) => params.append("filter", `${filter}`));
        if (searchInp && searchInp.length > 0) {
            params.append("search", searchInp);
        }
        setSearchParams(params); // they are query params
    }, [activeFilter, searchInp, searchParams]);

    useEffect(() => {
        fetchProducts();
        const existingFilter = searchParams.getAll("filter").map(Number);
        if (existingFilter.length) {
            setActiveFilter(existingFilter);
        }

        const existingSearch = searchParams.get("search");
        if (existingSearch?.length) {
            setSearchInp(existingSearch);
        }
    }, []);

    // separating the infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    console.log("1111");
                    setVisibleCount((prev) => prev + 10);
                }
            },
            {
                threshold: 1.0,
            }
        );

        const timerId = setTimeout(() => {
            if (productRef.current) {
                observer.observe(productRef.current);
            }
        }, 300);

        return () => {
            clearTimeout(timerId);
            if (productRef.current) {
                observer.unobserve(productRef.current);
            }
        };
    }, []);

    console.log("visible ", visibleCount, data.length);

    return (
        <div className="body">
            <div className="searchBar">
                <input
                    ref={inputRef}
                    type="text"
                    value={searchInp}
                    placeholder="Search product..."
                    onChange={(e) => debouncedSearch(e.target.value)}
                />
                <div className="searchIcon">🔍</div>
            </div>
            <div className="filters">
                <div className="filterTitle">Pricing Options :-</div>

                <div className="list">
                    {Object.entries(PRICING_OPTIONS).map(([key, value]) => {
                        return (
                            <label key={key} className="checkbox">
                                <input
                                    type="checkbox"
                                    name={value}
                                    onChange={handleFilter}
                                    value={key}
                                    checked={activeFilter.includes(+key)}
                                />
                                {value}
                            </label>
                        );
                    })}
                </div>
                <div className="rangeSlider">
                    <label className="tooltip" style={{ left: `${(range / 999) * 100}%` }}>{ "₹ " + range}</label>
                    <input type="range" min={0} max={999} step={5} value={range} onChange={(e) => setRange(+e.target.value)} />
                </div>
                <div className="reset" onClick={handleReset}>
                    Reset
                </div>
            </div>
            {products.length === 0 ? (
                <div className="loading">Loading...</div>
            ) : (
                <>
                    <div className="sortingDiv">
                        <span>Sort by: </span>
                        <select
                            className="selectBox"
                            onChange={(e) => setSorting(e.target.value)}
                        >
                            <option>Relevance</option>
                            <option>High to low</option>
                            <option>Low to high</option>
                        </select>
                    </div>
                    <div className="grid">
                        {products?.map((product) => {
                            return (
                                <div key={product.id} className="card">
                                    <div className="image">
                                        <img
                                            src={product?.imagePath}
                                            alt="product image"
                                        />
                                    </div>
                                    <div className="infoDiv">
                                        <div className="info">
                                            <div className="title">
                                                {product.title}
                                            </div>
                                            <div className="username">
                                                {product.creator}
                                            </div>
                                        </div>
                                        <div className="price">
                                            {product.pricingOption === 0
                                                ? product.price
                                                : product.pricingOption === 1
                                                ? "Free"
                                                : "View Only"}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
            {data.length > visibleCount && (
                <div ref={productRef} className="loading">
                    Loading...
                </div>
            )}
        </div>
    );
};

export default Body;
